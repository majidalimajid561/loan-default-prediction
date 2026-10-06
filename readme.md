# 🏦 Loan Default Prediction

A machine learning project that predicts whether a loan applicant will default on their loan, using multiple classification algorithms tuned with GridSearchCV.

---

## 📌 Problem Statement

Banks and financial institutions face significant losses when borrowers default on loans. The goal is to build a model that can **identify high-risk borrowers before approving loans**, minimizing financial losses.

**Business Priority:** Maximize **Recall** (catch as many defaulters as possible) because:
- **False Negative (FN)** — predicting "Safe" for a defaulter → **high cost**
- **False Positive (FP)** — predicting "Default" for a safe borrower → **low cost**

---

## 📊 Dataset

- **Source:** [Credit Risk Dataset — Kaggle](https://www.kaggle.com/datasets/laotse/credit-risk-dataset)
- **Size:** 32,581 rows × 12 columns
- **Target:** `loan_status`
  - `0` = Safe (loan repaid)
  - `1` = Default (loan not repaid)
- **Class Distribution:** ~78% Safe / ~22% Default

### Feature Description

| Column | Type | Description |
|--------|------|-------------|
| `person_age` | Numeric | Applicant's age |
| `person_income` | Numeric | Annual income |
| `person_home_ownership` | Categorical | RENT, OWN, MORTGAGE, OTHER |
| `person_emp_length` | Numeric | Employment length (years) |
| `loan_intent` | Categorical | EDUCATION, MEDICAL, VENTURE, etc. |
| `loan_grade` | Ordinal | A (best) to G (worst) |
| `loan_amnt` | Numeric | Loan amount requested |
| `loan_int_rate` | Numeric | Interest rate (%) |
| `loan_percent_income` | Numeric | Loan amount as fraction of income |
| `cb_person_default_on_file` | Binary | Past default history (Y/N) |
| `cb_person_cred_hist_length` | Numeric | Credit history length (years) |
| **`loan_status`** | **Target** | **0 = Safe, 1 = Default** |

---

## 🔬 Project Workflow

### 1. Exploratory Data Analysis (EDA)
- Checked class distribution (78:22)
- Analyzed target distribution
- Compared numeric features across classes using boxplots and mean tables
- Computed default rate per categorical category
- Correlation heatmap for numeric features
- Identified key predictors: `loan_int_rate`, `loan_grade`, `loan_percent_income`

### 2. Preprocessing Pipeline
- **Numeric features:** Median imputation → Standard Scaling
- **Ordinal feature (`loan_grade`):** Ordinal Encoding (A < B < C < ... < G)
- **Categorical features:** Most-frequent imputation → One-Hot Encoding

### 3. Models Tuned with GridSearchCV

Each algorithm was tuned using `GridSearchCV` with `scoring='recall'` and `cv=5`:

| Algorithm | Parameters Tuned |
|-----------|------------------|
| **Logistic Regression** | `C`, `penalty`, `solver`, `class_weight` |
| **KNN** | `n_neighbors`, `weights`, `p` |
| **SVC** | `C`, `kernel`, `gamma` |
| **Decision Tree** | `criterion`, `max_depth`, `min_samples_split`, `min_samples_leaf`, `max_features`, `class_weight`, `ccp_alpha` |
| **Random Forest** | `n_estimators`, `max_depth`, `min_samples_split`, `min_samples_leaf`, `max_features`, `class_weight` |
| **Gradient Boosting** | `n_estimators`, `learning_rate`, `max_depth`, `subsample` |
| **AdaBoost** | `n_estimators`, `learning_rate` |

---

## 📈 Results

### Model Comparison (Test Set)

| Model | Recall | Precision | F1 | ROC-AUC |
|-------|--------|-----------|-----|---------|
| Logistic Regression | 0.782 | 0.552 | 0.647 | 0.875 |
| KNN | 0.642 | 0.790 | 0.709 | 0.859 |
| SVC | 0.724 | 0.972 | 0.830 | — |
| Decision Tree | 0.648 | 0.551 | 0.596 | 0.818 |
| Random Forest | 0.780 | 0.700 | 0.738 | 0.906 |
| Gradient Boosting | 0.723 | 0.960 | 0.825 | 0.933 |
| AdaBoost | 0.491 | 0.870 | 0.628 | 0.895 |

### 🏆 Best Model: **Random Forest**

**Confusion Matrix (Test Set):**

**Metrics:**
- **Recall (Default):** 0.780
- **Precision (Default):** 0.700
- **F1-Score:** 0.738
- **ROC-AUC:** 0.906

**Best Hyperparameters:**
```python
{
    'n_estimators': 100,
    'max_depth': 5,
    'max_features': 'sqrt',
    'min_samples_split': 2,
    'min_samples_leaf': 2,
    'class_weight': 'balanced'
}
```

---

## 🖥️ Application

### FastAPI Backend
- `/` — Serves HTML form
- `/predict` — POST endpoint for predictions
-  — Serves CSS/JS from `frontend/`
- `/docs` — Auto-generated API documentation

### Frontend
- Custom HTML/CSS/JS
- Form with all applicant fields
- Real-time prediction via fetch API
- Color-coded result (Green = Safe, Red = Default)
- Probability display

### Streamlit (Alternative)
Also includes a Streamlit app for quick testing.

---
```
## 🛠️ Project Structure
loan_default_prediction/
│
├── data/
│ └── credit_risk_dataset.csv
│
├── notebooks/
│ ├── 01_eda.ipynb
│
├── fastapi/
│ ├── main.py
│ ├── prediction/
│ │ └── prediction.py
│ └── pydantic_model/
│ └── loan_application.py
│
├── frontend/
│ ├── index.html
│ ├── style.css
│ └── script.js
│
├── models/
│ ├── loan_default_pipeline.pkl
│ └── model_metadata.json
│
├── streamlit_app/
│ └── app.py
│
├── .gitignore
├── README.md
└── requirements.txt

```

---

## 🚀 How to Run

### 1. Installation
```bash
git clone https://github.com/majidalimajid561/loan-default-prediction.git
cd loan-default-prediction
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd fastapi
uvicorn main:app --reload

Streamlit_App:

streamlit run streamlit_app/app.py
```
---

## 👤 Author

Majid Mehmood

LinkedIn: [My Profile](www.linkedin.com/in/majid-mehmood-4286533ba)

---

If you find this project useful, feel free to ⭐ star the repository and explore the code.

