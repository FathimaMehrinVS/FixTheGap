# main.py

from fastapi import FastAPI, Query
import json
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
import os
from dotenv import load_dotenv
import requests
import pandas as pd
import pathlib

# --- FastAPI app ---
app = FastAPI(title="FixTheGap – Salary Transparency Simulator")

# --- Load environment variables ---
load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# --- Paths ---
BASE_DIR = pathlib.Path(__file__).parent  # app/
MODEL_DIR = BASE_DIR / "models_safe"
DATA_DIR = BASE_DIR.parent / "data"  # Assuming CSV is in FixTheGap/data/

# --- Load ML model ---
params = json.load(open(MODEL_DIR / "linear_model_params.json"))
model = LinearRegression()
model.coef_ = np.array(params["coef"])
model.intercept_ = np.array(params["intercept"])
model.n_features_in_ = len(params["features"])

# --- Load encoders ---
le_gender = LabelEncoder()
le_gender.classes_ = np.array(json.load(open(MODEL_DIR / "gender_encoder.json"))["classes"])

le_role = LabelEncoder()
le_role.classes_ = np.array(json.load(open(MODEL_DIR / "role_encoder.json"))["classes"])

# --- Load Kaggle dataset ---
KAGGLE_FILE = DATA_DIR / "ds_salaries.csv"
df_salaries = pd.read_csv(KAGGLE_FILE)
df_salaries["job_title_norm"] = df_salaries["job_title"].str.strip().str.lower()
df_salaries["location_norm"] = df_salaries["employee_residence"].str.strip().str.lower()

# --- Root endpoint ---
@app.get("/")
def root():
    return {"message": "FixTheGap API running"}

# --- Tavily API + Kaggle fallback ---
def get_real_time_salary(role: str, location: str = "India"):
    role_norm = role.strip().lower()
    location_norm = location.strip().lower()
    
    url = "https://api.tavily.com/v1/salaries"
    headers = {"Authorization": f"Bearer {TAVILY_API_KEY}"}
    params = {"job_title": role, "location": location}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception("Tavily API failed")
    except Exception:
        # --- Fallback using Kaggle dataset ---
        filtered = df_salaries[
            (df_salaries["job_title_norm"] == role_norm) &
            (df_salaries["location_norm"] == location_norm)
        ]
        if filtered.empty:
            fallback_row = df_salaries.sample(1).iloc[0]
        else:
            fallback_row = filtered.sample(1).iloc[0]

        return {
            "job_title": fallback_row["job_title"],
            "location": fallback_row["employee_residence"],
            "average_salary": int(fallback_row["salary_in_usd"]),
            "currency": "USD",
            "source": "Kaggle Dataset"
        }

# --- Prediction endpoint ---
@app.get("/predict")
def predict_salary(
    gender: str = Query(...),
    role: str = Query(...),
    experience: int = Query(...),
    location: str = Query("India")
):
    try:
        # --- Normalize inputs ---
        gender_input = gender.strip().lower()
        role_input = role.strip().lower()
        location_input = location.strip()

        # --- Map to encoder classes ---
        gender_map = {c.lower(): c for c in le_gender.classes_}
        if gender_input not in gender_map:
            return {"error": f"Unknown gender: {gender}. Allowed: {list(le_gender.classes_)}"}
        gender_val = gender_map[gender_input]

        role_map = {c.lower(): c for c in le_role.classes_}
        if role_input not in role_map:
            return {"error": f"Unknown role: {role}. Allowed: {list(le_role.classes_)}"}
        role_val = role_map[role_input]

        # --- Encode features and predict ML salary ---
        gender_encoded = le_gender.transform([gender_val])[0]
        role_encoded = le_role.transform([role_val])[0]
        X_input = np.array([[experience, role_encoded, gender_encoded]])
        predicted_salary = round(float(model.predict(X_input)[0]), 2)

        # --- Apply gender-based pay gap simulation ---
        gap_percent = 10  # simulate 10% systemic gap for females
        if gender_input == "female":
            gender_adjusted_salary = round(predicted_salary * (1 - gap_percent / 100), 2)
        else:
            gender_adjusted_salary = predicted_salary
        pay_gap = round(predicted_salary - gender_adjusted_salary, 2)

        # --- Fetch Tavily/Kaggle salary for comparison ---
        tavily_data = get_real_time_salary(role, location_input)

        # --- Prepare chart data for frontend visualization ---
        chart_data = {
            "labels": ["Predicted Salary", "Gender Adjusted Salary", "Market Average"],
            "values": [
                predicted_salary,
                gender_adjusted_salary,
                tavily_data.get("average_salary", predicted_salary)
            ]
        }

        return {
            "predicted_salary": predicted_salary,
            "gender_adjusted_salary": gender_adjusted_salary,
            "pay_gap": pay_gap,
            "tavily_data": tavily_data,
            "chart_data": chart_data
        }

    except Exception as e:
        return {"error": str(e)}