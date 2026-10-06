import streamlit as st
import pandas as pd
import joblib
import json
import os




# ============================================================
# Page Config
# ============================================================
st.set_page_config(
    page_title="Loan Default Predictor",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# Load Model & Metadata (cached)
# ============================================================
@st.cache_resource
def load_model():
    model = joblib.load('../models/rf_model.pkl')
    return model
try:
    model= load_model()
except Exception as e:
    st.error(f"⚠️ Model load nahi hua: {e}")
    st.stop()

# ============================================================
# Custom CSS
# ============================================================
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #1e3a8a, #3b82f6);
        padding: 30px;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin-bottom: 30px;
    }
    .main-header h1 {
        color: white;
        margin: 0;
        font-size: 2.5rem;
    }
    .main-header p {
        color: #dbeafe;
        margin-top: 10px;
        font-size: 1.1rem;
    }
    .result-safe {
        background: linear-gradient(135deg, #10b981, #34d399);
        padding: 30px;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin-top: 20px;
    }
    .result-default {
        background: linear-gradient(135deg, #dc2626, #f87171);
        padding: 30px;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin-top: 20px;
    }
    .result-safe h2, .result-default h2 {
        color: white;
        margin: 0;
        font-size: 2rem;
    }
    .result-safe p, .result-default p {
        color: white;
        font-size: 1.2rem;
        margin-top: 10px;
    }
    .metric-box {
        background: #f3f4f6;
        padding: 15px;
        border-radius: 10px;
        text-align: center;
        margin: 10px 0;
    }
    .stButton > button {
        background: linear-gradient(135deg, #1e3a8a, #3b82f6);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: bold;
        width: 100%;
        transition: all 0.3s;
    }
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(30,58,138,0.3);
    }
</style>
""", unsafe_allow_html=True)

# ============================================================
# Header
# ============================================================
st.markdown("""
<div class="main-header">
    <h1>🏦 Loan Default Predictor</h1>
    <p>Predict whether a loan applicant will default — powered by Machine Learning</p>
</div>
""", unsafe_allow_html=True)

# ============================================================
# Input Form
# ============================================================
st.markdown("## 📋 Applicant Details")

with st.form("prediction_form"):
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("#### 👤 Personal")
        person_age = st.number_input("Age", min_value=18, max_value=100, value=30, step=1)
        person_income = st.number_input("Annual Income ($)", min_value=0, max_value=10_000_000, value=50000, step=1000)
        person_home_ownership = st.selectbox(
            "Home Ownership",
            options=['RENT', 'OWN', 'MORTGAGE', 'OTHER']
        )
        person_emp_length = st.number_input("Employment Length (years)", min_value=0.0, max_value=50.0, value=3.0, step=0.5)

    with col2:
        st.markdown("#### 💰 Loan Details")
        loan_intent = st.selectbox(
            "Loan Purpose",
            options=['EDUCATION', 'MEDICAL', 'VENTURE', 'PERSONAL', 'DEBTCONSOLIDATION', 'HOMEIMPROVEMENT']
        )
        loan_grade = st.selectbox(
            "Loan Grade",
            options=['A', 'B', 'C', 'D', 'E', 'F', 'G']
        )
        loan_amnt = st.number_input("Loan Amount ($)", min_value=0, max_value=100000, value=10000, step=500)
        loan_int_rate = st.number_input("Interest Rate (%)", min_value=0.0, max_value=30.0, value=11.0, step=0.1)

    with col3:
        st.markdown("#### 📈 Credit History")
        loan_percent_income = st.slider(
            "Loan % of Income",
            min_value=0.0, max_value=1.0, value=0.20, step=0.01,
            help="Loan amount ÷ Annual income"
        )
        cb_person_default_on_file = st.selectbox(
            "Past Default on File",
            options=['N', 'Y'],
            help="Y = has previously defaulted, N = no past default"
        )
        cb_person_cred_hist_length = st.number_input(
            "Credit History Length (years)",
            min_value=0, max_value=50, value=5, step=1
        )

    # Submit button
    st.markdown("<br>", unsafe_allow_html=True)
    submitted = st.form_submit_button("🔮 Predict Loan Default", use_container_width=True)

# ============================================================
# Prediction
# ============================================================
if submitted:
    # Build input DataFrame
    input_df = pd.DataFrame({
        'person_age': [person_age],
        'person_income': [person_income],
        'person_home_ownership': [person_home_ownership],
        'person_emp_length': [person_emp_length],
        'loan_intent': [loan_intent],
        'loan_grade': [loan_grade],
        'loan_amnt': [loan_amnt],
        'loan_int_rate': [loan_int_rate],
        'loan_percent_income': [loan_percent_income],
        'cb_person_default_on_file': [cb_person_default_on_file],
        'cb_person_cred_hist_length': [cb_person_cred_hist_length]
    })

    with st.spinner("Analyzing applicant profile..."):
        try:
            proba = model.predict_proba(input_df)[0]
            p_safe = proba[0]
            p_default = proba[1]
            prediction = 1 if p_default >= 0.40 else 0
            
        except Exception as e:
            st.error(f"Prediction error: {e}")
            st.stop()

    st.markdown("---")
    st.markdown("## 🎯 Prediction Result")

    # Result display
    if prediction == 1:
        st.markdown(f"""
        <div class="result-default">
            <h2>⚠️ HIGH RISK — Likely to DEFAULT</h2>
            <p>Default Probability: <strong>{p_default:.2%}</strong></p>
            <p>Recommendation: Review carefully before approval</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="result-safe">
            <h2>✅ LOW RISK — Likely SAFE</h2>
            <p>Default Probability: <strong>{p_default:.2%}</strong></p>
            <p>Recommendation: Eligible for loan approval</p>
        </div>
        """, unsafe_allow_html=True)

    # Detailed metrics
    st.markdown("### 📊 Probability Breakdown")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Probability of Default", f"{p_default:.2%}")
    with c2:
        st.metric("Probability of Safe", f"{p_safe:.2%}")
    with c3:
        st.metric("Threshold Used", f"{0.40}")

    # Progress bar
    st.markdown("### 📈 Risk Meter")
    st.progress(float(p_default))

    # Input summary (expander)
    with st.expander("🔍 View Applicant Details"):
        st.dataframe(input_df.T.rename(columns={0: 'Value'}), use_container_width=True)

    # Disclaimer
    st.markdown("---")
    st.caption("⚠️ This prediction is based on a machine learning model and should be used as a supporting tool, not as the sole decision maker.")

# ============================================================
# Footer
# ============================================================
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#6b7280;'>Built with ❤️ using Streamlit & Random Forest</p>",
    unsafe_allow_html=True
)