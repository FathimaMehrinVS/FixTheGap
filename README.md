FixTheGap 🎯



Basic Details


Team Name: FixTheGap


Team Members
Esha Byju Nair – Muthoot Institute of Technology and Science

Fathima Mehrin V S – Muthoot Institute of Technology and Science 



Hosted Project Link


https://fix-the-ckomtzp14-fathima-mehrin-v-ss-projects.vercel.app/
Project Description


FixTheGap is a web-based ML-powered salary transparency simulator that predicts unbiased market salaries using public data and simulates gender pay gap impact. It raises awareness about compensation disparities through ethical AI design and visual comparison.

The Problem Statement


Salary transparency remains limited across industries, contributing to hidden gender-based compensation disparities. Without reliable benchmarks, individuals — especially women — may negotiate from an informational disadvantage.

The Solution


We developed a full-stack web application that:

Predicts unbiased salary using a trained ML model

Compares predicted salary with user’s actual income

Simulates systemic gender pay gap impact separately

Clearly visualizes compensation differences

Promotes salary transparency awareness



The system ensures ethical separation between machine learning prediction and bias simulation.

Technical Details


Technologies/Components Used


For Software:

Languages used: Python, HTML, CSS, JavaScript

Frameworks used: FastAPI

Libraries used: Pandas, Scikit-learn, Joblib

Tools used: VS Code, Git, Render, Uvicorn



For Hardware:

Not applicable (Software-only project)

Features
Unbiased Salary Prediction: ML-based salary estimation using industry, role, experience, and location

Actual vs Market Comparison: Compares predicted salary with user’s actual income

Gender Pay Gap Simulation: Transparent post-prediction awareness adjustment

Interactive Web Interface: Multi-page HTML frontend

Real-time API Integration: FastAPI backend

Visual Comparison Chart: Displays predicted vs adjusted salary

Educational Awareness Page: Explains gender pay gap and ethical AI design

Implementation


For Software:


Installation
# Clone the repository
git clone https://github.com/your-username/fix-the-gap.git

# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt
Run
# Start FastAPI server
uvicorn main:app --host 0.0.0.0 --port 10000
Then open in browser:

http://127.0.0.1:8000
Frontend HTML pages are served using FastAPI templates or static hosting.

Project Documentation


For Software:


Screenshots (Add at least 3)
Home page introducing the project and navigation options
<img width="1875" height="959" alt="image" src="https://github.com/user-attachments/assets/4d6d5b6c-7689-4adb-a656-de7e67f2b5e6" />

Simulation page where users input industry, job role, location, years of experience, actual income, and gender
<img width="1843" height="965" alt="image" src="https://github.com/user-attachments/assets/35a89485-b062-4ef9-bba8-4623a45c702c" />

Results page displaying predicted salary, adjusted salary, gap value, and comparison chart
<img width="1878" height="973" alt="image" src="https://github.com/user-attachments/assets/c9d4e4a7-62b3-4257-9d0b-d92d993f97ad" />

Diagrams
System Architecture:
<img width="873" height="791" alt="image" src="https://github.com/user-attachments/assets/07713e6b-ee68-4be6-8276-d9839c8a0da0" />

User interacts with HTML frontend → Form data sent to FastAPI backend → Backend encodes features → ML model predicts salary → Gender simulation applied → Response returned → Results displayed on webpage

Application Workflow:

Home → Simulation Page → Submit Form → Backend Prediction → Results Display → Awareness Page

Additional Documentation


For Web Projects with Backend:


API Documentation
Base URL: https://your-render-app.onrender.com

POST /predict
Description: Predicts unbiased market salary based on user inputs and applies gender pay gap simulation.

Request Body:

{
  "industry": "Technology",
  "job_role": "Data Scientist",
  "location": "US",
  "years_of_experience": 5,
  "actual_income": 90000,
  "gender": "Female"
}
Response:

{
  "predicted_salary": 125000,
  "gender_adjusted_salary": 112500,
  "gap": 12500,
  "difference_from_actual": 35000
}
Response Fields Explanation
predicted_salary → Unbiased ML-predicted market salary

gender_adjusted_salary → Salary after awareness-based simulation

gap → Simulated pay gap difference

difference_from_actual → Difference between predicted salary and user’s actual income

Project Demo


Video


[Add your demo video link here]



Demonstrates full workflow from input form to pay gap visualization and salary comparison.

AI Tools Used (Transparency Section)


Tool Used: ChatGPT



Purpose:

Backend architecture planning

ML pipeline structuring

Documentation refinement

Debugging assistance



Percentage of AI-generated code: Minimal boilerplate guidance



Human Contributions:

Architecture design

Dataset preprocessing and filtering

ML model training and validation

Backend API implementation

HTML/CSS frontend development

Integration and deployment

Team Contributions
Esha Byju Nair: Frontend development (HTML/CSS/JS), UI design, API integration

Fathima Mehrin V S: Backend development, ML model training, API design, deployment

License


This project is licensed under the MIT License.

Made with ❤️ at TinkerHub Hackathon

