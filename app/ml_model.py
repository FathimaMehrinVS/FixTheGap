import os
import json
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models_safe")
DATA_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "data", "salaries.csv"))

os.makedirs(MODEL_DIR, exist_ok=True)
print("Model folder path:", MODEL_DIR)
print("Dataset path:", DATA_PATH)

df = pd.read_csv(DATA_PATH)

le_gender = LabelEncoder()
df["gender_encoded"] = le_gender.fit_transform(df["gender"])

le_role = LabelEncoder()
df["role_encoded"] = le_role.fit_transform(df["role"])

X = df[["experience", "role_encoded", "gender_encoded"]]
y = df["salary"]

model = LinearRegression()
model.fit(X, y)

params = {
    "coef": model.coef_.tolist(),
    "intercept": float(model.intercept_),
    "features": list(X.columns),
}

with open(os.path.join(MODEL_DIR, "linear_model_params.json"), "w", encoding="utf-8") as f:
    json.dump(params, f, indent=2)

with open(os.path.join(MODEL_DIR, "gender_encoder.json"), "w", encoding="utf-8") as f:
    json.dump({"classes": le_gender.classes_.tolist()}, f, indent=2)

with open(os.path.join(MODEL_DIR, "role_encoder.json"), "w", encoding="utf-8") as f:
    json.dump({"classes": le_role.classes_.tolist()}, f, indent=2)

print("JSON files saved to:", MODEL_DIR)
print("Files:", os.listdir(MODEL_DIR))
