# AutoXL 🤖

> **AI-powered browser extension that runs AutoML directly on your spreadsheet data**

![Version](https://img.shields.io/badge/version-1.3-blue)
![Python](https://img.shields.io/badge/python-3.12-green)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-teal)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## What is AutoXL?

AutoXL is a Chrome browser extension that brings automated machine learning directly into your spreadsheet workflow. Connect your Google Sheet or upload a CSV, select a target column from a dropdown, and AutoXL automatically trains multiple ML models, compares their performance, selects the best one, explains the results using SHAP, and generates a plain English AI summary using Groq — no ML expertise required.

The extension opens as a **Chrome Side Panel** alongside your browser so you can see your data and results at the same time.

---

## Demo

```
Connect Google Sheets → Select Target Column → Train Model
→ AutoML Results + SHAP Explainability + AI Summary + Chat
```

---

## Features

- **Chrome Side Panel UI** — opens alongside your browser, no popup interruptions
- **Google Sheets Integration** — OAuth 2.0 login, reads live sheet data directly
- **Column Dropdown** — auto-populated from your sheet headers, no typing needed
- **CSV Upload** — fallback option, works with any CSV dataset
- **AutoML Pipeline** — automatically trains and compares 4 ML models
- **Task Auto-Detection** — detects classification vs regression automatically
- **SHAP Explainability** — shows which features influenced the model most
- **Best Model Selection** — picks the highest performing model automatically
- **AI Summary** — Groq LLM explains results in plain English after training
- **Chat Interface** — ask questions about your data and get intelligent answers
- **Download Predictions** — export predictions as a CSV file
- **Particle Background** — animated canvas UI with toggle on/off
- **REST API Backend** — FastAPI backend deployable to any cloud platform

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | JavaScript, HTML, CSS (WebExtensions API, Manifest V3) |
| UI | Chrome Side Panel, Canvas Particles, Dark Theme |
| Auth | Google OAuth 2.0 (chrome.identity.launchWebAuthFlow) |
| Data Source | Google Sheets API v4 + CSV Upload |
| Backend | Python, FastAPI |
| ML | Scikit-learn, XGBoost |
| Explainability | SHAP |
| AI Summary | Groq API (llama-3.3-70b-versatile) — Free |
| Data Processing | Pandas, NumPy |
| Model Persistence | Joblib |

---

## Project Structure

```
AutoXL/
│
├── backend/
│   ├── main.py           # FastAPI server + all endpoints
│   ├── automl.py         # AutoML training pipeline
│   ├── preprocess.py     # Data cleaning + encoding
│   ├── predict.py        # Prediction logic
│   ├── explain.py        # SHAP explainability
│   ├── summarize.py      # Groq AI summary + chat
│   └── requirements.txt
│
├── extension/
│   ├── manifest.json     # Chrome Manifest V3 config
│   ├── sidepanel.html    # Side panel UI
│   ├── popup.js          # Frontend logic + particles
│   ├── auth.js           # Google OAuth flow
│   ├── background.js     # Service worker + side panel opener
│   ├── content.js        # Sheet data extraction
│   ├── style.css         # Dark theme styling
│   └── icons/            # Extension icons
│
├── sample_data/
│   └── sample.csv        # Sample dataset for testing
│
└── README.md
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/2006harshith/AutoXL.git
cd AutoXL
```

### 2. Set up Python backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pandas numpy scikit-learn xgboost shap python-multipart pydantic python-dotenv joblib groq
```

### 3. Add environment variables

Create `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key at: `console.groq.com`

### 4. Run the backend

```bash
cd ~/Desktop/AutoXL
source backend/venv/bin/activate
PYTHONPATH=backend uvicorn backend.main:app --reload
```

Backend runs at `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

### 5. Load the extension in Chrome

```
1. Open Chrome → chrome://extensions
2. Enable Developer Mode (top right toggle)
3. Click "Load unpacked"
4. Select the AutoXL/extension/ folder
5. Click the AutoXL icon in toolbar → Side Panel opens
```

### 6. Use AutoXL

```
Option A — Google Sheets:
1. Open a Google Sheet
2. Click AutoXL icon → Side Panel opens
3. Click "Connect Sheets" → Login with Google
4. Select target column from dropdown
5. Click "Train Model"

Option B — CSV Upload:
1. Click AutoXL icon → Side Panel opens
2. Upload your CSV file
3. Enter target column name
4. Click "Train Model"

After training:
- View model comparison + accuracy
- See SHAP feature importance
- Read AI summary in plain English
- Ask questions in the chat
- Download predictions
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/train` | Train AutoML pipeline |
| POST | `/predict` | Get predictions |
| GET | `/explain` | Get SHAP feature importance |
| POST | `/summarize` | Get AI summary or answer question |

### Example /train Request

```json
POST /train
{
  "data": [
    {"age": 25, "salary": 50000, "experience": 2, "promoted": 0},
    {"age": 30, "salary": 75000, "experience": 5, "promoted": 1}
  ],
  "target_column": "promoted"
}
```

### Example /train Response

```json
{
  "status": "success",
  "task_type": "classification",
  "best_model": "RandomForest",
  "metrics": {
    "DecisionTree": {"accuracy": 0.95},
    "RandomForest": {"accuracy": 0.97},
    "XGBoost": {"accuracy": 0.96}
  },
  "explanation": {
    "top_features": ["experience", "salary", "age"],
    "feature_importance": {
      "experience": 0.45,
      "salary": 0.32,
      "age": 0.23
    }
  }
}
```

### Example /summarize Request

```json
POST /summarize
{
  "ml_result": {
    "task_type": "classification",
    "best_model": "RandomForest",
    "metrics": {"RandomForest": {"accuracy": 0.97}},
    "explanation": {
      "top_features": ["experience", "age"],
      "feature_importance": {"experience": 0.45}
    }
  },
  "question": "Why is experience the most important feature?"
}
```

---

## How It Works

```
User opens Google Sheet or uploads CSV
              ↓
Extension reads data (via Sheets API or file)
              ↓
Sends to FastAPI backend
              ↓
preprocess.py — cleans + encodes data
              ↓
automl.py — detects task type, trains all models
              ↓
Best model selected automatically
              ↓
explain.py — SHAP analysis
              ↓
summarize.py — Groq generates plain English summary
              ↓
Results + Summary + Chat shown in Side Panel
```

---

## Models Used

| Model | Type | Strength |
|-------|------|----------|
| Linear Regression | Regression | Fast, interpretable |
| Decision Tree | Both | Visual, easy to explain |
| Random Forest | Both | High accuracy, robust |
| XGBoost | Both | Best performance overall |

---

## Roadmap

- [x] CSV upload and AutoML pipeline
- [x] SHAP feature explainability
- [x] Chrome Side Panel UI
- [x] Particle background animation
- [x] Google Sheets API integration
- [x] Google OAuth 2.0
- [x] Column selection dropdown
- [x] Groq AI summary
- [x] Chat interface
- [x] Download predictions
- [ ] Deploy backend to Render/Railway
- [ ] React UI with data visualizations
- [ ] Model comparison charts
- [ ] Export predictions back to Google Sheet
- [ ] Firefox compatibility

---

## Why AutoXL?

Unlike tools like Gemini's built-in Sheets summarization, AutoXL performs **actual supervised machine learning** — training real models on your specific data, comparing their performance, and explaining predictions using SHAP values. It then uses a free LLM to explain results in plain English and answer your questions about the data.

> "AutoML + Explainability + AI Chat — all inside your browser, on your own data."

---

## Author

**Harshith** — [@2006harshith](https://github.com/2006harshith)

---

## License

MIT License — feel free to use, modify, and distribute.
