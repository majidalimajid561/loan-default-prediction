from fastapi import FastAPI
from pydantic_model.loan_class import loan_application 
from prediction.prediction import prediction, model_version
from fastapi.middleware.cors import CORSMiddleware

app =FastAPI()

@app.get('/')
def home():
    return f"majid again has reached here model version {model_version}"


app.add_middleware(CORSMiddleware,
                   allow_headers=['*'],
                   allow_methods=['*'],
                   allow_origins=['*']
                   )


@app.post('/prediction')
def predict(data:loan_application):
    input_data={"person_age":data.person_age,
    "person_income":data.person_income,
    "person_home_ownership":data.person_home_ownership,
    "person_emp_length":data.person_emp_length,
    "loan_intent":data.loan_intent,
    "loan_grade":data.loan_grade,
     "loan_amnt":data.loan_amnt,
     "loan_int_rate":data.loan_int_rate,
     "loan_percent_income":data.loan_percent_income,
     "cb_person_default_on_file":data.cb_person_default_on_file,
     "cb_person_cred_hist_length":data.cb_person_cred_hist_length}

    
    prob=prediction(input_data)
    if prob >=0.40:
             # not safe
             label=1
             status='default'
    else:
            # safe
             label=0
             status='safe'
    return {"probability":prob,"prediction":label,"status":status}