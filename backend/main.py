# backend/main.py
from backend.summarize import SummarizeRequest, generate_summary
from backend.preprocess import preprocess_data
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

from backend.automl import train_models
from backend.predict import predict


app = FastAPI(title="AI Spreadsheet AutoML API")


# -------------------------------
# CORS Middleware
# -------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------
# Request Schema
# -------------------------------
class TrainRequest(BaseModel):
    data: list
    target_column: str


class PredictRequest(BaseModel):
    data: list


# -------------------------------
# Health Check
# -------------------------------
@app.get("/")
def home():
    return {"message": "AutoML API is running"}

@app.post("/summarize")
async def summarize(data: SummarizeRequest):
    try:
        summary_text = generate_summary(data.ml_result, data.question)
        return {"summary": summary_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# -------------------------------
# Train Endpoint
# -------------------------------
@app.post("/train")
def train(request: TrainRequest):
    try:
        df = pd.DataFrame(request.data)
        df = preprocess_data(df, request.target_column)

        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty")

        if len(df) < 5:
            raise HTTPException(
                status_code=400,
                detail="Dataset too small for training (min 5 rows required)"
            )

        if request.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{request.target_column}' not found"
            )

        result = train_models(df, request.target_column)

        return {
            "status": "success",
            "task_type": result["task_type"],
            "best_model": result["best_model"],
            "metrics": result["metrics"],
            "explanation": result["explanation"],
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(e)}"
        )


# -------------------------------
# Predict Endpoint
# -------------------------------
@app.post("/predict")
def predict_endpoint(request: PredictRequest):
    try:
        model = joblib.load("backend/models/model.joblib")
        columns = joblib.load("backend/models/columns.joblib")

        # Convert input → DataFrame
        df = pd.DataFrame(request.data)

        # Predict (NO preprocessing here)
        preds = predict(model, df.to_dict(orient="records"), columns)

        return {
            "status": "success",
            "predictions": preds
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 