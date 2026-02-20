import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
import joblib

# Load dataset
df = pd.read_csv("data/salaries.csv")

# Encode categorical features
le_gender = LabelEncoder()
df['gender_encoded'] = le_gender.fit_transform(df['gender'])

le_role = LabelEncoder()
df['role_encoded'] = le_role.fit_transform(df['role'])

# Select features and target
X = df[['experience', 'role_encoded', 'gender_encoded']]
y = df['salary']

# Train Linear Regression model
model = LinearRegression()
model.fit(X, y)

# Save the model and encoders
joblib.dump(model, "app/model.pkl")
joblib.dump(le_gender, "app/le_gender.pkl")
joblib.dump(le_role, "app/le_role.pkl")

print("ML model trained and saved successfully.")