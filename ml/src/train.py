"""
Pipeline d'entraînement local (régression) avec split temporel, preprocessing num/cat,
enregistrement des artefacts, et tracking optionnel MLflow.
"""

import argparse
import os
from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    import mlflow
except ImportError:  
    mlflow = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "global_cancer_50years_extended_patient_level.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "Target_Severity_Score" not in df.columns:
        raise ValueError("Colonne cible 'Target_Severity_Score' manquante.")
    return df


def build_pipeline(df: pd.DataFrame) -> Tuple[Pipeline, pd.DataFrame, pd.Series]:
    target = "Target_Severity_Score"
    y = df[target].astype(float)
    X = df.drop(columns=[target])

    numeric_features = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categorical_features = X.select_dtypes(include=["object"]).columns.tolist()

    num_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    cat_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preproc = ColumnTransformer(
        transformers=[
            ("num", num_pipe, numeric_features),
            ("cat", cat_pipe, categorical_features),
        ]
    )

    model = GradientBoostingRegressor(random_state=42)
    pipe = Pipeline(
        steps=[
            ("preproc", preproc),
            ("model", model),
        ]
    )
    return pipe, X, y


def temporal_split(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2):
    # Split en gardant la temporalité (Year doit exister)
    if "Year" in X.columns:
        years = np.sort(X["Year"].unique())
        cutoff = years[int(len(years) * (1 - test_size))]
        train_idx = X["Year"] <= cutoff
        test_idx = X["Year"] > cutoff
        return X[train_idx], X[test_idx], y[train_idx], y[test_idx]
  
    return train_test_split(X, y, test_size=test_size, random_state=42)


def log_mlflow(mae, rmse, model_path):
    if mlflow is None:
        return
    with mlflow.start_run():
        mlflow.log_metric("mae", mae)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_artifact(model_path)


def train(data_path: Path, use_mlflow: bool = False):
    df = load_data(data_path)
    pipe, X, y = build_pipeline(df)
    X_train, X_test, y_train, y_test = temporal_split(X, y, test_size=0.2)

    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds, squared=False)

    print(f"MAE: {mae:.3f} | RMSE: {rmse:.3f}")

    model_path = ARTIFACTS_DIR / "model.joblib"
    joblib.dump(pipe, model_path)
    print(f"Modèle enregistré dans {model_path}")

    if use_mlflow:
        log_mlflow(mae, rmse, model_path)


def cli():
    parser = argparse.ArgumentParser(description="Train risk severity model")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Chemin du CSV")
    parser.add_argument("--mlflow", action="store_true", help="Activer le tracking MLflow si installé")
    args = parser.parse_args()
    train(args.data, use_mlflow=args.mlflow)


if __name__ == "__main__":
    cli()
