import joblib 
import pandas as pd


model=None
try:
    model=joblib.load('../models/rf_model.pkl')
    model_version='1.0.0'
    print("Model  loaded")
except Exception as e:
    raise FileNotFoundError(f"The file at ../../models/rf_model.pkl")


def prediction(input):
    if model==None:
            return "Modle did not loaded"
    data=pd.DataFrame([input])
    prob=model.predict_proba(data)[0][1]
    return round(prob,2)


