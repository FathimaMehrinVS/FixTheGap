 FixTheGap – Salary Transparency Simulator

“Know your worth. See the gap. Close the future.”

Authors: Fathima Mehrin V S & Esha Byju Nair

---

## 🚀 Project Overview

FixTheGap is a Machine Learning-powered salary transparency simulator designed to raise awareness about gender pay disparities. By leveraging public datasets and predictive modeling, the app empowers individuals to understand unbiased market salaries and visualize potential gender-based pay gaps.

Hackathon Goal: Build a fully functional mobile app with a backend, ML model, and deployment within **15 hours**.

---

## 🌍 Problem Statement

Salary transparency is limited, resulting in hidden gender-based compensation gaps. Without access to reliable benchmarks, individuals—especially women—may negotiate from an informational disadvantage.

---

## 💡 Solution

* Predicts unbiased market salary using an ML model trained on real-world data.
* Simulates potential gender pay gap impact.
* Provides visual comparison for easy understanding.
* Offers educational content on the gender pay gap.

---

## 🟣 System Architecture

```
Flutter Mobile App
        ↓
FastAPI Backend
        ↓
Trained Linear Regression Model (.pkl)
        ↓
Public Salary Dataset (Filtered)
```

---

## 🟣 Technical Stack

**Frontend:** Flutter, HTTP package
**Backend:** Python, FastAPI, Uvicorn
**Machine Learning:** Pandas, Scikit-learn, Linear Regression, Joblib
**Deployment:** Render (Free Tier)

---

## 🧠 Machine Learning Design

**Objective:** Predict unbiased market salary based on:

* Experience Level
* Role
* Location

**Feature Encoding:**

| Feature          | Encoding                                                   |
| ---------------- | ---------------------------------------------------------- |
| Experience Level | EN → 0, MI → 1, SE → 2, EX → 3                             |
| Role             | Software Engineer → 0, Data Scientist → 1, ML Engineer → 2 |
| Location         | Non-US → 0, US → 1                                         |

**ML Steps:**

1. Load CSV dataset
2. Filter roles
3. Encode categorical variables
4. Split features (X) and target (y)
5. Train Linear Regression model
6. Save model as `salary_model.pkl`

**Why Linear Regression:**

* Fast to train
* Transparent and explainable
* Suitable for hackathon timeframe

---

## 🟣 Gender Pay Gap Simulation

* Model predicts unbiased salary.
* If `gender == Female`, apply **8–12% reduction** to simulate systemic bias.
* Allows ethical separation of predictions and awareness-based adjustment.

---

## 🟣 Backend API

**Endpoint:** `/predict`

**Input Parameters:**

* experience_level
* role
* location
* gender

**Response:**

```json
{
  "predicted_salary": 120000,
  "gender_adjusted_salary": 108000,
  "gap": 12000
}
```

---

## 🟣 App Pages

1. **Splash Screen:** App name & tagline
2. **Home Page:** Start simulation, Learn About Pay Gap
3. **Simulation Input Page:** Role, Experience, Location, Gender
4. **Results Page:** Predicted salary, Gender-adjusted salary, Gap, Comparison chart
5. **Awareness Page:** Explanation of pay gap, model, and importance of transparency

---

## 🟣 Repository Structure

```
salary-transparency-simulator/
│
├── backend/
│   ├── raw_dataset.csv
│   ├── cleaned_dataset.csv
│   ├── train_model.py
│   ├── salary_model.pkl
│   ├── main.py
│   ├── requirements.txt
│
└── frontend/
```

---

## ⏱ 15-Hour Hackathon Timeline

| Hours | Tasks                                         |
| ----- | --------------------------------------------- |
| 0–1   | Notion setup, GitHub repo, download dataset   |
| 1–3   | Filter dataset, encode features, save CSV     |
| 3–4   | Train ML model, save `.pkl`, test predictions |
| 4–6   | Build FastAPI backend, test Swagger endpoints |
| 6–10  | Flutter UI development                        |
| 10–12 | Connect Flutter to backend, debug             |
| 12–14 | Deploy backend on Render, update API URL      |
| 14–15 | UI polish, demo prep, README documentation    |

---

## 🟣 Deployment

**Backend:** Render Free Tier

**Steps:**

1. Push backend to GitHub
2. Connect Render to repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Update Flutter app API endpoint

---

## 🟣 Demo Narrative

1. Introduce salary opacity problem
2. Show dataset and ML prediction
3. Demonstrate gender-adjusted salary simulation
4. Highlight awareness and social impact
5. Showcase full-stack mobile implementation

---

## 🌱 Future Scope

* Expand job roles
* Crowd-sourced salary inputs
* Analytics dashboard
* Regional filtering
* Fair-pay insights

---

## ✅ Success Criteria

* ML model trained successfully
* Backend deployed and accessible
* Flutter app connected to API
* Clean and intuitive UI
* Clear demo explanation

---

## 🟣 Key Differentiators

* Real public dataset integration
* Separation of unbiased prediction and systemic gap simulation
* Full-stack mobile application
* Social impact focus
* Deployable prototype within hackathon constraints

