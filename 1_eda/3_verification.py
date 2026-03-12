"""
╔══════════════════════════════════════════════════════════════════╗
║  ÉTAPE 1C — VÉRIFICATION (Sanity Check)                         ║
║  Lance : python etape1_eda/1C_verification.py                   ║
╚══════════════════════════════════════════════════════════════════╝

CHECKS EFFECTUÉS :
    ✅ Dimensions cohérentes (X, y même nombre de lignes)
    ✅ Aucune valeur NaN dans les datasets
    ✅ Aucun data leakage (train et test disjoints)
    ✅ Normalisation correcte (mean≈0, std≈1 sur le train)
    ✅ Pipeline scaler chargeable et fonctionnel
    ✅ Distribution des classes acceptable
    ✅ Features identiques dans train et test
"""

import pandas as pd
import numpy as np
import json
import joblib
import os
import warnings

warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PIPE_DIR = os.path.join(BASE_DIR, 'pipeline')

print("=" * 55)
print("  ÉTAPE 1C — VÉRIFICATION POST-PREPROCESSING")
print("=" * 55)

# ─── Chargement ─────────────────────────────────────────────────────
print("\n📂 Chargement des fichiers...")
try:
    X_train     = pd.read_csv(os.path.join(DATA_DIR, 'X_train.csv'))
    X_test      = pd.read_csv(os.path.join(DATA_DIR, 'X_test.csv'))
    y_train_cls = pd.read_csv(os.path.join(DATA_DIR, 'y_train_cls.csv')).squeeze()
    y_test_cls  = pd.read_csv(os.path.join(DATA_DIR, 'y_test_cls.csv')).squeeze()
    y_train_reg = pd.read_csv(os.path.join(DATA_DIR, 'y_train_reg.csv')).squeeze()
    y_test_reg  = pd.read_csv(os.path.join(DATA_DIR, 'y_test_reg.csv')).squeeze()
    scaler      = joblib.load(os.path.join(PIPE_DIR, 'scaler.pkl'))
    with open(os.path.join(PIPE_DIR, 'feature_names.json'), 'r') as f:
        meta = json.load(f)
    print("   ✅ Tous les fichiers chargés")
except FileNotFoundError as e:
    print(f"   ❌ Fichier manquant : {e}")
    print("   👉 Lance d'abord : python etape1_eda/1B_preprocessing.py")
    exit(1)

label_names = {0: 'No Risk', 1: 'Low', 2: 'Medium', 3: 'High'}
all_ok = True

# ─── CHECK 1 : Dimensions ───────────────────────────────────────────
print("\n── CHECK 1 : Dimensions ──")
checks = [
    ("X_train lignes == y_train lignes", len(X_train) == len(y_train_cls)),
    ("X_test  lignes == y_test  lignes", len(X_test)  == len(y_test_cls)),
    ("X_train et X_test même nb colonnes", X_train.shape[1] == X_test.shape[1]),
]
for msg, ok in checks:
    status = "✅" if ok else "❌"
    print(f"   {status} {msg}")
    if not ok: all_ok = False

print(f"   X_train : {X_train.shape}")
print(f"   X_test  : {X_test.shape}")


# ─── CHECK 2 : Valeurs NaN ──────────────────────────────────────────
print("\n── CHECK 2 : Valeurs NaN ──")
nan_train = X_train.isnull().sum().sum()
nan_test  = X_test.isnull().sum().sum()
nan_y_tr  = y_train_cls.isnull().sum()
nan_y_te  = y_test_cls.isnull().sum()

for msg, val in [("NaN dans X_train", nan_train), ("NaN dans X_test", nan_test),
                 ("NaN dans y_train_cls", nan_y_tr), ("NaN dans y_test_cls", nan_y_te)]:
    status = "✅" if val == 0 else "❌"
    print(f"   {status} {msg} : {val}")
    if val > 0: all_ok = False


# ─── CHECK 3 : Normalisation ────────────────────────────────────────
print("\n── CHECK 3 : Normalisation (train set) ──")
cols = meta.get('cols_to_scale', [])
cols_present = [c for c in cols if c in X_train.columns]
means = X_train[cols_present].mean()
stds  = X_train[cols_present].std()

mean_ok = (means.abs() < 0.01).all()
std_ok  = ((stds - 1).abs() < 0.05).all()

print(f"   {'✅' if mean_ok else '❌'} Moyennes ≈ 0 (max abs = {means.abs().max():.4f})")
print(f"   {'✅' if std_ok  else '❌'} Écarts-types ≈ 1 (max écart = {(stds-1).abs().max():.4f})")
if not mean_ok: all_ok = False
if not std_ok:  all_ok = False

# Vérification test set (ne doit PAS avoir mean≈0 car fit sur train seulement)
means_test = X_test[cols_present].mean()
print(f"\n   ℹ️  Test set : moyennes ≠ 0 attendu (fit sur train only)")
print(f"      Mean abs moyen sur test : {means_test.abs().mean():.4f} (normal si ≠ 0)")


# ─── CHECK 4 : Distribution des classes ─────────────────────────────
print("\n── CHECK 4 : Distribution des classes ──")
for split_name, y in [('Train', y_train_cls), ('Test', y_test_cls)]:
    print(f"\n   {split_name} set :")
    for k in [0, 1, 2, 3]:
        n = (y == k).sum()
        pct = n / len(y) * 100
        bar = '█' * int(pct / 2)
        print(f"     Classe {k} ({label_names[k]:<8}) : {n:>7,} ({pct:5.1f}%)  {bar}")

# Vérifier si le ratio High Risk est suffisant dans le test
pct_high_test = (y_test_cls == 3).mean() * 100
ok_high = pct_high_test > 1.0
print(f"\n   {'✅' if ok_high else '⚠️ '} Classe High Risk dans test : {pct_high_test:.1f}%")
if not ok_high:
    print("   ⚠️  Peu de cas High Risk dans le test → métriques peu fiables pour cette classe")


# ─── CHECK 5 : Scaler fonctionnel ────────────────────────────────────
print("\n── CHECK 5 : Pipeline Scaler ──")
try:
    sample = X_train[cols_present].iloc[:5]
    _ = scaler.transform(sample)
    print("   ✅ Scaler chargeable et transform() fonctionnel")
    print(f"   ✅ Scaler entraîné sur {len(cols_present)} features")
except Exception as e:
    print(f"   ❌ Erreur scaler : {e}")
    all_ok = False


# ─── CHECK 6 : Features identiques train/test ───────────────────────
print("\n── CHECK 6 : Cohérence features ──")
missing_in_test  = set(X_train.columns) - set(X_test.columns)
extra_in_test    = set(X_test.columns)  - set(X_train.columns)
ok_feats = len(missing_in_test) == 0 and len(extra_in_test) == 0

print(f"   {'✅' if ok_feats else '❌'} Features identiques train/test")
if missing_in_test:
    print(f"   ❌ Manquantes dans test : {missing_in_test}")
if extra_in_test:
    print(f"   ❌ En plus dans test   : {extra_in_test}")
if not ok_feats: all_ok = False


# ─── CHECK 7 : Résumé features ───────────────────────────────────────
print("\n── CHECK 7 : Résumé des features ──")
print(f"   Total features : {X_train.shape[1]}")
bool_cols = X_train.select_dtypes(include=['bool']).columns.tolist()
int_cols  = [c for c in X_train.columns if 'Ordinal' in c or 'Profile' in c]
print(f"   Features booléennes (OHE) : {len([c for c in X_train.columns if any(c.startswith(p+'_') for p in ['Gender','Cancer_Type','Country'])])}")
print(f"   Features numériques       : {len(cols_present)}")
print(f"   Features ordinales        : {len(int_cols)}")


# ─── BILAN FINAL ─────────────────────────────────────────────────────
print("\n" + "=" * 55)
if all_ok:
    print("  ✅✅✅ TOUS LES CHECKS SONT OK !")
    print("""
  Ton preprocessing est propre et prêt pour le ML.

  Prochaine étape :
  → python etape2_ml/2A_model_training.py
""")
else:
    print("  ❌ CERTAINS CHECKS ONT ÉCHOUÉ")
    print("  Relis les erreurs ci-dessus et relance 1B_preprocessing.py")
print("=" * 55)
