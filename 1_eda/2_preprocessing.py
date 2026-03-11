"""
╔══════════════════════════════════════════════════════════════════╗
║  ÉTAPE 1B — PREPROCESSING & FEATURE ENGINEERING                 ║
║  Lance : python etape1_eda/1B_preprocessing.py                  ║
╚══════════════════════════════════════════════════════════════════╝

CE QUE CE SCRIPT PRODUIT :
    data/X_train.csv           → Features train (normalisées)
    data/X_test.csv            → Features test  (normalisées)
    data/y_train_cls.csv       → Cible train (classes 0-3)
    data/y_test_cls.csv        → Cible test  (classes 0-3)
    data/y_train_reg.csv       → Cible train (valeur continue)
    data/y_test_reg.csv        → Cible test  (valeur continue)
    data/df_processed_full.csv → Dataset complet preprocessé
    pipeline/scaler.pkl        → StandardScaler ajusté
    pipeline/feature_names.json
"""

import pandas as pd
import numpy as np
import os
import json
import joblib
import warnings
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

# ─── CHEMINS ────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_IN   = os.path.join(BASE_DIR, 'data', 'global_cancer_50years_extended_patient_level.csv')
DATA_DIR  = os.path.join(BASE_DIR, 'data')
PIPE_DIR  = os.path.join(BASE_DIR, 'pipeline')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PIPE_DIR, exist_ok=True)


print("=" * 55)
print("  ÉTAPE 1B — PREPROCESSING")
print("=" * 55)


# ════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT
# ════════════════════════════════════════════════════════════════════
print("\n[1/7] Chargement des données...")
df = pd.read_csv(DATA_IN)
print(f"      ✅ {df.shape[0]:,} lignes × {df.shape[1]} colonnes")
print(f"      Valeurs manquantes : {df.isnull().sum().sum()} ✅")


# ════════════════════════════════════════════════════════════════════
# 2. FEATURE ENGINEERING
# ════════════════════════════════════════════════════════════════════
print("\n[2/7] Feature Engineering...")

df['Years_Since_1975'] = df['Year'] - 1975
df['Decade']           = (df['Year'] // 10) * 10

# Score comportemental composite (pondéré par les corrélations de l'EDA)
df['Behavioral_Risk_Score'] = (
    df['Smoking']       * 0.35 +
    df['Alcohol_Use']   * 0.20 +
    df['Obesity_Level'] * 0.25 +
    df['Air_Pollution'] * 0.20
)

# Score total (comportemental + génétique)
df['Total_Risk_Index'] = (
    df['Behavioral_Risk_Score'] * 0.75 +
    df['Genetic_Risk']          * 0.25
)

# Flag : profil triple risque élevé
df['High_Risk_Profile'] = (
    (df['Smoking']       > 5) &
    (df['Air_Pollution'] > 5) &
    (df['Obesity_Level'] > 5)
).astype(int)

# Features d'interaction (capture les effets non-linéaires)
df['Smoking_x_AirPollution'] = df['Smoking'] * df['Air_Pollution']
df['Genetic_x_Behavioral']  = df['Genetic_Risk'] * df['Behavioral_Risk_Score']
df['Age_x_Genetic']         = df['Age'] * df['Genetic_Risk']

print(f"      ✅ 7 nouvelles features créées")
print(f"         - Years_Since_1975, Decade")
print(f"         - Behavioral_Risk_Score, Total_Risk_Index")
print(f"         - High_Risk_Profile")
print(f"         - Smoking_x_AirPollution, Genetic_x_Behavioral, Age_x_Genetic")


# ════════════════════════════════════════════════════════════════════
# 3. ENCODAGE
# ════════════════════════════════════════════════════════════════════
print("\n[3/7] Encodage des variables catégorielles...")

# Cancer_Stage → Ordinal (ordre médical clair)
stage_map = {'Stage 0': 0, 'Stage I': 1, 'Stage II': 2, 'Stage III': 3, 'Stage IV': 4}
df['Cancer_Stage_Ordinal'] = df['Cancer_Stage'].map(stage_map)
print(f"      ✅ Cancer_Stage → ordinal (0 à 4)")

# Gender, Cancer_Type, Country → One-Hot Encoding
ohe_cols = ['Gender', 'Cancer_Type', 'Country']
df = pd.get_dummies(df, columns=ohe_cols, prefix=ohe_cols, drop_first=False)
ohe_new_cols = [c for c in df.columns if any(c.startswith(p+'_') for p in ohe_cols)]
print(f"      ✅ One-Hot Encoding : {len(ohe_new_cols)} nouvelles colonnes")
for col in ohe_cols:
    n = len([c for c in df.columns if c.startswith(col+'_')])
    print(f"         - {col} → {n} colonnes")


# ════════════════════════════════════════════════════════════════════
# 4. VARIABLES CIBLES
# ════════════════════════════════════════════════════════════════════
print("\n[4/7] Création des variables cibles...")

# Cible régression
y_reg = df['Target_Severity_Score'].copy()

# Cible classification (4 classes)
bins   = [-0.001, 0.001, 3.0, 6.0, 10.0]
labels = [0, 1, 2, 3]
label_names = {0: 'No Risk', 1: 'Low', 2: 'Medium', 3: 'High'}
y_cls = pd.cut(df['Target_Severity_Score'], bins=bins, labels=labels, include_lowest=True).astype(int)

print(f"      ✅ y_regression  : continue [0 → {y_reg.max():.2f}]")
print(f"      ✅ y_classification : 4 classes")
for k, v in label_names.items():
    n = (y_cls == k).sum()
    print(f"         Classe {k} ({v:<8}) : {n:>7,} ({n/len(y_cls)*100:.1f}%)")

# Supprimer colonnes inutiles pour le ML
drop_cols = ['Patient_ID', 'Cancer_Stage', 'Year', 'Target_Severity_Score']
X = df.drop(columns=drop_cols, errors='ignore')
feature_names = X.columns.tolist()

print(f"\n      📊 Features finales : {len(feature_names)} colonnes")


# ════════════════════════════════════════════════════════════════════
# 5. SPLIT TEMPOREL (SANS DATA LEAKAGE)
# ════════════════════════════════════════════════════════════════════
print("\n[5/7] Split temporel Train/Test...")

# On relit l'année depuis le CSV original (avant drop)
year_col = pd.read_csv(DATA_IN, usecols=['Year'])['Year'].values
train_mask = year_col <= 2019
test_mask  = year_col >= 2020

X_train = X[train_mask].reset_index(drop=True)
X_test  = X[test_mask].reset_index(drop=True)
y_train_reg = y_reg[train_mask].reset_index(drop=True)
y_test_reg  = y_reg[test_mask].reset_index(drop=True)
y_train_cls = y_cls[train_mask].reset_index(drop=True)
y_test_cls  = y_cls[test_mask].reset_index(drop=True)

print(f"      ✅ Train : {len(X_train):,} patients (1975–2019) — {len(X_train)/len(X)*100:.1f}%")
print(f"      ✅ Test  : {len(X_test):,} patients (2020–2024) — {len(X_test)/len(X)*100:.1f}%")

# Vérification anti-leakage
print(f"\n      ✅ Anti-leakage : train et test sont disjoints par année")
print(f"         Pourquoi ? Le modèle est entraîné sur le passé → prédit le futur")


# ════════════════════════════════════════════════════════════════════
# 6. NORMALISATION (fit sur TRAIN uniquement)
# ════════════════════════════════════════════════════════════════════
print("\n[6/7] Normalisation (StandardScaler)...")

cols_to_scale = [
    'Age', 'Genetic_Risk', 'Air_Pollution', 'Alcohol_Use',
    'Smoking', 'Obesity_Level', 'Survival_Years', 'Treatment_Cost_USD',
    'Years_Since_1975', 'Decade', 'Behavioral_Risk_Score', 'Total_Risk_Index',
    'Smoking_x_AirPollution', 'Genetic_x_Behavioral', 'Age_x_Genetic'
]
# Garder seulement les colonnes qui existent
cols_to_scale = [c for c in cols_to_scale if c in X_train.columns]

scaler = StandardScaler()
scaler.fit(X_train[cols_to_scale])   # ← FIT uniquement sur TRAIN

X_train[cols_to_scale] = scaler.transform(X_train[cols_to_scale])
X_test[cols_to_scale]  = scaler.transform(X_test[cols_to_scale])  # ← transform seulement

print(f"      ✅ {len(cols_to_scale)} colonnes normalisées")
print(f"         (mean≈0, std≈1 sur le train set)")
print(f"      ⚠️  Le scaler est FIT sur TRAIN uniquement → pas de leakage")


# ════════════════════════════════════════════════════════════════════
# 7. SAUVEGARDE
# ════════════════════════════════════════════════════════════════════
print("\n[7/7] Sauvegarde des fichiers...")

# CSV datasets
X_train.to_csv(os.path.join(DATA_DIR, 'X_train.csv'), index=False)
X_test.to_csv(os.path.join(DATA_DIR, 'X_test.csv'), index=False)
y_train_reg.to_csv(os.path.join(DATA_DIR, 'y_train_reg.csv'), index=False, header=['Target_Severity_Score'])
y_test_reg.to_csv(os.path.join(DATA_DIR, 'y_test_reg.csv'), index=False, header=['Target_Severity_Score'])
y_train_cls.to_csv(os.path.join(DATA_DIR, 'y_train_cls.csv'), index=False, header=['Risk_Class'])
y_test_cls.to_csv(os.path.join(DATA_DIR, 'y_test_cls.csv'), index=False, header=['Risk_Class'])

# Dataset complet (utile pour Inès/BI)
df_full = X.copy()
df_full['Target_Severity_Score'] = y_reg.values
df_full['Risk_Class']            = y_cls.values
df_full['Risk_Class_Label']      = df_full['Risk_Class'].map(label_names)
df_full.to_csv(os.path.join(DATA_DIR, 'df_processed_full.csv'), index=False)

# Pipeline sklearn
joblib.dump(scaler, os.path.join(PIPE_DIR, 'scaler.pkl'))

# Métadonnées features
meta = {
    'feature_names': feature_names,
    'cols_to_scale': cols_to_scale,
    'ohe_columns': ohe_cols,
    'stage_mapping': stage_map,
    'label_names': label_names,
    'train_years': '1975–2019',
    'test_years': '2020–2024',
    'n_features': len(feature_names),
    'n_train': int(train_mask.sum()),
    'n_test': int(test_mask.sum()),
    'class_distribution_train': {
        label_names[k]: int((y_train_cls == k).sum())
        for k in [0, 1, 2, 3]
    }
}
with open(os.path.join(PIPE_DIR, 'feature_names.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=2, ensure_ascii=False)

print(f"      ✅ data/X_train.csv           ({X_train.shape})")
print(f"      ✅ data/X_test.csv            ({X_test.shape})")
print(f"      ✅ data/y_train_cls.csv       ({y_train_cls.shape})")
print(f"      ✅ data/y_test_cls.csv        ({y_test_cls.shape})")
print(f"      ✅ data/y_train_reg.csv       ({y_train_reg.shape})")
print(f"      ✅ data/df_processed_full.csv ({df_full.shape})")
print(f"      ✅ pipeline/scaler.pkl")
print(f"      ✅ pipeline/feature_names.json")


print(f"""
{"=" * 55}
  🎉 PREPROCESSING TERMINÉ !
{"=" * 55}

  Récapitulatif :
  ┌─────────────────────────────────────────────────┐
  │  Features d'entrée  : {len(feature_names)} colonnes               │
  │  Train set          : {len(X_train):,} patients (1975-2019)  │
  │  Test set           : {len(X_test):,} patients (2020-2024)   │
  │  Cible classif.     : 4 classes (0=No Risk → 3=High) │
  │  Cible régression   : valeur continue [0–9.16]   │
  └─────────────────────────────────────────────────┘

  Prochaine étape :
  → python etape1_eda/1C_verification.py
""")
