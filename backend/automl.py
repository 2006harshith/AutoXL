# backend/automl.py
from backend.explain import explain_model
import joblib
import os
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error

from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

from xgboost import XGBClassifier, XGBRegressor


# -------------------------------
# Detect Task Type
# -------------------------------
def detect_task_type(y):
    """
    Detect whether the problem is classification or regression
    """

    if y.dtype == "object":
        return "classification"

    if y.dtype in ["float64", "float32"]:
        return "regression"

    if y.nunique() < 10:
        return "classification"

    return "regression"


# -------------------------------
# Train Models
# -------------------------------
def train_models(df: pd.DataFrame, target_column: str):

    if len(df) < 20:
        raise ValueError("Dataset too small — need at least 20 rows")

    X = df.drop(columns=[target_column])
    y = df[target_column]

    X = pd.get_dummies(X)
    X = X.fillna(0)

    task_type = detect_task_type(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if task_type == "classification":
        models = {
            "DecisionTree": DecisionTreeClassifier(),
            "RandomForest": RandomForestClassifier(),
            "XGBoost": XGBClassifier(eval_metric="logloss", verbosity=0),
        }
    else:
        models = {
            "LinearRegression": LinearRegression(),
            "DecisionTree": DecisionTreeRegressor(),
            "RandomForest": RandomForestRegressor(),
            "XGBoost": XGBRegressor(verbosity=0),
        }

    best_model = None
    best_score = -np.inf
    best_model_name = None
    metrics = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        if task_type == "classification":
            score = accuracy_score(y_test, predictions)
            metrics[name] = {"accuracy": round(score, 4)}
        else:
            rmse = round(np.sqrt(mean_squared_error(y_test, predictions)), 4)
            score = -rmse
            metrics[name] = {"rmse": rmse}

        if score > best_score:
            best_score = score
            best_model = model
            best_model_name = name

    # -------------------------------
    # Save model + feature columns
    # -------------------------------
    os.makedirs("backend/models", exist_ok=True)

    joblib.dump(best_model, "backend/models/model.joblib")
    joblib.dump(list(X.columns), "backend/models/columns.joblib")
    explanation = explain_model(best_model, X_train)

    # -------------------------------
    # Return Results
    # -------------------------------
    return {
        "task_type": task_type,
        "best_model": best_model_name,
        "metrics": metrics,
        "explanation": explanation, 
        "model_object": best_model
    }