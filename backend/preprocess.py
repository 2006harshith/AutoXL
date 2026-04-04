# backend/preprocess.py

import pandas as pd


def preprocess_data(df: pd.DataFrame, target_column: str = None):
    """
    Cleans and prepares dataframe for model training and prediction
    """

    df = df.copy()

    # Remove rows with missing target
    if target_column is not None:
        df = df.dropna(subset=[target_column])

    # Drop empty columns and duplicates
    df.dropna(axis=1, how="all", inplace=True)
    df.drop_duplicates(inplace=True)

    # Handle missing values
    for col in df.columns:
        if col == target_column:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            df[col].fillna(df[col].median(), inplace=True)
        else:
            mode = df[col].mode()
            fill_value = mode[0] if not mode.empty else "Unknown"
            df[col].fillna(fill_value, inplace=True)

    # Remove high cardinality categorical columns
    for col in df.columns:
        if col == target_column:
            continue

        if df[col].dtype == "object" and df[col].nunique() > 50:
            df.drop(columns=[col], inplace=True)

    # Encode categorical columns
    cat_columns = df.select_dtypes(include=["object"]).columns.tolist()

    if target_column is not None and target_column in cat_columns:
        cat_columns.remove(target_column)

    if len(cat_columns) > 0:
        df = pd.get_dummies(df, columns=cat_columns)

    # Ensure dataframe still has features
    if df.shape[1] == 0:
        raise ValueError("No usable features after preprocessing")

    # Remove constant columns
    constant_cols = [
        col for col in df.columns
        if df[col].nunique() <= 1 and col != target_column
    ]
    df.drop(columns=constant_cols, inplace=True)

    # Reset index
    df.reset_index(drop=True, inplace=True)

    return df