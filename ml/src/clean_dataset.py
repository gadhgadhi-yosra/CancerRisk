"""
Nettoyage basique du jeu de données cancer.

- Charge le CSV brut.
- Supprime les doublons Patient_ID.
- Filtre les années hors [1900, 2100].
- Clip/filtre les âges (0-120).
- Convertit les colonnes numériques et impute les valeurs manquantes (médiane).
- Impute les colonnes catégorielles (mode).
- Sauvegarde un CSV nettoyé et un Parquet.
"""

import argparse
from pathlib import Path
from typing import List

import pandas as pd


NUM_COLS: List[str] = [
    "Age",
    "Year",
    "Genetic_Risk",
    "Air_Pollution",
    "Alcohol_Use",
    "Smoking",
    "Obesity_Level",
    "Treatment_Cost_USD",
    "Survival_Years",
    "Target_Severity_Score",
]


def load_df(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    # drop duplicates on Patient_ID if present
    if "Patient_ID" in df.columns:
        df = df.drop_duplicates(subset=["Patient_ID"])
    # filter year
    if "Year" in df.columns:
        df = df[(df["Year"] >= 1900) & (df["Year"] <= 2100)]
    # clip ages
    if "Age" in df.columns:
        df["Age"] = df["Age"].clip(lower=0, upper=120)

    # ensure numeric types
    for col in NUM_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # impute numeric median
    for col in NUM_COLS:
        if col in df.columns:
            median = df[col].median()
            df[col] = df[col].fillna(median)

    # impute categorical mode
    cat_cols = [c for c in df.columns if c not in NUM_COLS]
    for col in cat_cols:
        mode = df[col].mode(dropna=True)
        if not mode.empty:
            df[col] = df[col].fillna(mode.iloc[0])
        else:
            df[col] = df[col].fillna("Unknown")

    return df


def save_outputs(df: pd.DataFrame, out_csv: Path):
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_csv, index=False)
    try:
        df.to_parquet(out_csv.with_suffix(".parquet"), index=False)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Nettoyage du dataset cancer")
    parser.add_argument("--infile", type=Path, default=Path("../data/global_cancer_50years_extended_patient_level.csv"))
    parser.add_argument("--outfile", type=Path, default=Path("../data/global_cancer_clean.csv"))
    args = parser.parse_args()

    df = load_df(args.infile)
    clean = clean_df(df)
    save_outputs(clean, args.outfile)
    print(f"Nettoyage terminé. Lignes : {len(clean)}. Fichiers : {args.outfile} (+ parquet si possible).")


if __name__ == "__main__":
    main()
