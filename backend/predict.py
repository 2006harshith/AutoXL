# backend/predict.py

import pandas as pd


def predict(model, input_data: list, feature_columns: list):
    """
    Takes preprocessed input data → returns predictions
    """

    # Convert input → DataFrame
    df = pd.DataFrame(input_data)

    # Align columns with training data
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0

    # Ensure correct column order
    df = df[feature_columns]

    predictions = model.predict(df)

    return predictions.tolist()