# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from backend.automl import train_models

app = FastAPI(title="AI Spreadsheet AutoML API")


# -------------------------------
# CORS Middleware (for extension)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------
# Request Schema
# -------------------------------
class TrainRequest(BaseModel):
    data: list
    target_column: str


# -------------------------------
# Health Check Endpoint
# -------------------------------
@app.get("/")
def home():
    return {"message": "AutoML API is running"}


# -------------------------------
# Train Endpoint
# -------------------------------
@app.post("/train")
def train(request: TrainRequest):
    try:
        # Convert JSON → DataFrame
        df = pd.DataFrame(request.data)

        # -------------------------------
        # Input Validation
        # -------------------------------

        # Empty dataset check
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="Dataset is empty"
            )

        # Minimum rows check (ML needs data)
        if len(df) < 5:
            raise HTTPException(
                status_code=400,
                detail="Dataset too small for training (min 5 rows required)"
            )

        # Target column check
        if request.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{request.target_column}' not found"
            )

        # -------------------------------
        # AutoML Execution
        # -------------------------------
        result = train_models(df, request.target_column)

        # -------------------------------
        # Response
        # -------------------------------
        return {
            "status": "success",
            "task_type": result["task_type"],
            "best_model": result["best_model"],
            "metrics": result["metrics"]
        }

    except HTTPException:
        # Preserve correct HTTP error codes
        raise

    except Exception as e:
        # Catch unexpected errors
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(e)}"
        )