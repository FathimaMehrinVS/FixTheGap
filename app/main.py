# main.py

from fastapi import FastAPI, Query
import json
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder

app = FastAPI(title="FixTheGap – Salary Transparency Simulator")

MODEL_DIR = "app/models_safe"

# --- Load model parameters ---
params = json.load(open(f"{MODEL_DIR}/linear_model_params.json"))
model = LinearRegression()
model.coef_ = np.array(params["coef"])
model.intercept_ = np.array(params["intercept"])
model.n_features_in_ = len(params["features"])  # required for sklearn >=1.0

# --- Load encoders ---
le_gender = LabelEncoder()
le_gender.classes_ = np.array(json.load(open(f"{MODEL_DIR}/gender_encoder.json"))["classes"])

le_role = LabelEncoder()
le_role.classes_ = np.array(json.load(open(f"{MODEL_DIR}/role_encoder.json"))["classes"])

# --- Root endpoint ---
@app.get("/")
def root():
    return {"message": "FixTheGap API running"}

# --- Prediction endpoint ---
@app.get("/predict")
def predict_salary(
    gender: str = Query(...),
    role: str = Query(...),
    experience: int = Query(...)
):
    try:
        gender_encoded = le_gender.transform([gender])[0]
        role_encoded = le_role.transform([role])[0]

        X_input = np.array([[experience, role_encoded, gender_encoded]])
        predicted_salary = model.predict(X_input)[0]

        return {"predicted_salary": round(float(predicted_salary), 2)}
    except Exception as e:
        return {"error": str(e)}