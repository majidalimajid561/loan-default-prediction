from pydantic import BaseModel,Field
from typing import Optional,Literal

class loan_application(BaseModel):
 person_age:int=Field(...,description="Age of a person")
 person_income:float=Field(...,description="THe income of a person")
 person_home_ownership:Literal['OWN','MORTGAGE','OTHER','RENT']=Field(...,description="homw owner ship")
 person_emp_length:int=Field(...,description="how mant year of employment")
 loan_intent:Literal['EDUCATION','MEDICAL','VENTURE','PERSONAL','DEBTCONSOLIDATION','HOMEIMPROVEMENT']=Field(...,description="whihc purpose")
 loan_grade:Literal['A','B','C','D','E','F','G']=Field(...,description="grade of loan")
 loan_amnt:float=Field(...,description="how much amount")
 loan_int_rate:float=Field(...,description='Interest rate (%)')
 loan_percent_income:float
 cb_person_default_on_file:Literal['Y','N']=Field(...,description="Past default history (Y/N)")
 cb_person_cred_hist_length:int=Field(...,description="Credit history length (years)")
 
 
 
