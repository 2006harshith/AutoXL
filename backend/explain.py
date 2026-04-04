# backend/explain.py

import shap
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression


def explain_model(model, X_train: pd.DataFrame):
    """
    Returns SHAP feature importance for trained model
    """

    try:
        # -------------------------------
        # Sample data for performance
        # -------------------------------
        if len(X_train) > 100:
            X_sample = shap.sample(X_train, 100)
        else:
            X_sample = X_train.copy()

        # -------------------------------
        # Choose explainer
        # -------------------------------
        if hasattr(model, "feature_importances_"):
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)

        elif isinstance(model, LinearRegression):
            explainer = shap.LinearExplainer(model, X_sample)
            shap_values = explainer.shap_values(X_sample)

        else:
            explainer = shap.KernelExplainer(
                model.predict,
                shap.sample(X_sample, 50)
            )
            shap_values = explainer.shap_values(X_sample)

        # -------------------------------
        # Handle classification output
        # -------------------------------
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]

# Handle 3D case (samples, features, classes)
        if len(shap_values.shape) == 3:
            shap_values = shap_values[:, :, 1]

        # -------------------------------
        # Compute importance
        # -------------------------------
        importance = pd.Series(
            np.abs(shap_values).mean(axis=0),
            index=X_sample.columns
        )

        importance = importance.sort_values(ascending=False)

        return {
            "feature_importance": importance.round(4).to_dict(),
            "top_features": importance.head(5).index.tolist()
        }

    except Exception as e:
        return {
            "feature_importance": {},
            "top_features": [],
            "error": str(e)
        }