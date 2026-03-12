"""
╔══════════════════════════════════════════════════════════════════╗
║  ÉTAPE 2 — ENTRAÎNEMENT DES MODÈLES ML                          ║
║  Lance : python 2_ml/1_model_training.py                        ║
╚══════════════════════════════════════════════════════════════════╝

CE QUE CE SCRIPT FAIT :
    1. Charge les données preprocessées (depuis data/)
    2. Entraîne 3 modèles : Random Forest, XGBoost, LightGBM
    3. Compare leurs performances (Accuracy, F1, AUC)
    4. Sélectionne automatiquement le meilleur modèle
    5. Sauvegarde le meilleur modèle pour l'étape XAI

CE QUE CE SCRIPT PRODUIT :
    pipeline/best_model.pkl              → meilleur modèle sauvegardé
    pipeline/all_models.pkl              → tous les modèles sauvegardés
    pipeline/model_results.json          → métriques de tous les modèles
    pipeline/feature_importances.csv     → importance des features
    2_ml/figures/01_comparison.png       → comparaison des modèles
    2_ml/figures/02_confusion_matrix.png → matrices de confusion
    2_ml/figures/03_roc_curves.png       → courbes ROC
    2_ml/figures/04_feature_importance.png
    2_ml/figures/05_f1_par_classe.png
    2_ml/results.txt                     → rapport complet
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import json
import os
import warnings
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, roc_auc_score, roc_curve
)
from sklearn.preprocessing import label_binarize
import xgboost as xgb
import lightgbm as lgb

warnings.filterwarnings('ignore')

# ─── CHEMINS ────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PIPE_DIR = os.path.join(BASE_DIR, 'pipeline')
FIG_DIR  = os.path.join(BASE_DIR, '2_ml', 'figures')
os.makedirs(FIG_DIR, exist_ok=True)
os.makedirs(PIPE_DIR, exist_ok=True)

# ─── STYLE ──────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams['figure.facecolor'] = '#F8FAFC'
plt.rcParams['axes.facecolor']   = 'white'
COLORS      = {'blue':'#2563EB','red':'#DC2626','orange':'#F59E0B',
               'green':'#16A34A','purple':'#7C3AED'}
RISK_COLORS = ['#16A34A','#60A5FA','#F59E0B','#DC2626']
CLASS_NAMES = ['No Risk','Low','Medium','High']


# ════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT
# ════════════════════════════════════════════════════════════════════
print("=" * 55)
print("  ÉTAPE 2 — ENTRAÎNEMENT DES MODÈLES ML")
print("=" * 55)
print("\n[1/5] Chargement des données preprocessées...")

X_train = pd.read_csv(os.path.join(DATA_DIR, 'X_train.csv'))
X_test  = pd.read_csv(os.path.join(DATA_DIR, 'X_test.csv'))
y_train = pd.read_csv(os.path.join(DATA_DIR, 'y_train_cls.csv')).squeeze()
y_test  = pd.read_csv(os.path.join(DATA_DIR, 'y_test_cls.csv')).squeeze()

with open(os.path.join(PIPE_DIR, 'feature_names.json'), 'r') as f:
    meta = json.load(f)

print(f"      ✅ X_train : {X_train.shape}")
print(f"      ✅ X_test  : {X_test.shape}")
print(f"\n      Distribution classes (train) :")
for i, name in enumerate(CLASS_NAMES):
    n = (y_train == i).sum()
    print(f"         Classe {i} ({name:<8}) : {n:>7,} ({n/len(y_train)*100:.1f}%)")
print(f"\n      ⚠️  Dataset déséquilibré → class_weight='balanced' activé")


# ════════════════════════════════════════════════════════════════════
# 2. DÉFINITION DES MODÈLES
# ════════════════════════════════════════════════════════════════════
print("\n[2/5] Définition des modèles...")

models = {

    # Robuste, résistant au surapprentissage
    'Random Forest': RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_leaf=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    ),

    # Gradient boosting, très performant sur données tabulaires
    'XGBoost': xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        verbosity=0
    ),

    # Plus rapide que XGBoost, excellent sur grands datasets
    'LightGBM': lgb.LGBMClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        is_unbalance=True,
        random_state=42,
        n_jobs=-1,
        verbose=-1
    ),
}

print(f"      ✅ {len(models)} modèles : {', '.join(models.keys())}")


# ════════════════════════════════════════════════════════════════════
# 3. ENTRAÎNEMENT ET ÉVALUATION
# ════════════════════════════════════════════════════════════════════
print("\n[3/5] Entraînement et évaluation...")
print("      (patience, 250k lignes × 3 modèles ~3-5 min...)\n")

results        = {}
trained_models = {}
y_test_bin     = label_binarize(y_test, classes=[0,1,2,3])

for name, model in models.items():
    print(f"      🔄 Entraînement {name}...")

    model.fit(X_train, y_train)

    y_pred       = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    acc     = accuracy_score(y_test, y_pred)
    f1_mac  = f1_score(y_test, y_pred, average='macro')
    f1_wgt  = f1_score(y_test, y_pred, average='weighted')
    f1_each = f1_score(y_test, y_pred, labels=[0,1,2,3], average=None, zero_division=0)
    # AUC : ignorer les classes absentes du test set
    present_classes = np.unique(y_test)
    if len(present_classes) >= 2:
        auc = roc_auc_score(
            y_test_bin[:, present_classes],
            y_pred_proba[:, present_classes],
            multi_class='ovr', average='macro'
        )
    else:
        auc = 0.0
    cm      = confusion_matrix(y_test, y_pred, labels=[0,1,2,3])
    report  = classification_report(y_test, y_pred, labels=[0,1,2,3], target_names=CLASS_NAMES, zero_division=0)

    results[name] = {
        'accuracy':     acc,
        'f1_macro':     f1_mac,
        'f1_weighted':  f1_wgt,
        'f1_per_class': f1_each,
        'auc':          auc,
        'confusion_matrix': cm,
        'report':       report,
        'y_pred':       y_pred,
        'y_pred_proba': y_pred_proba,
    }
    trained_models[name] = model

    print(f"         Accuracy   : {acc:.4f}")
    print(f"         F1 Macro   : {f1_mac:.4f}")
    print(f"         F1 Weighted: {f1_wgt:.4f}")
    print(f"         AUC (OvR)  : {auc:.4f}")
    print(f"         F1/classe  : { {CLASS_NAMES[i]: round(f1_each[i],3) for i in range(4)} }\n")

# Sélection du meilleur modèle (critère : F1 Macro)
best_name  = max(results, key=lambda m: results[m]['f1_macro'])
best_model = trained_models[best_name]
best_res   = results[best_name]
model_names = list(results.keys())

print(f"      🏆 MEILLEUR MODÈLE : {best_name}")
print(f"         F1 Macro = {best_res['f1_macro']:.4f} | AUC = {best_res['auc']:.4f}")


# ════════════════════════════════════════════════════════════════════
# 4. VISUALISATIONS
# ════════════════════════════════════════════════════════════════════
print("\n[4/5] Génération des figures...")

bar_colors = [COLORS['blue'], COLORS['orange'], COLORS['purple']]

# ── Figure 1 : Comparaison des modèles ──────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(18, 6))
fig.suptitle('Comparaison des Modèles ML', fontsize=15, fontweight='bold')

for ax, (metric_name, metric_key) in zip(axes, [
    ('Accuracy',  'accuracy'),
    ('F1 Macro',  'f1_macro'),
    ('AUC (OvR)', 'auc'),
]):
    values = [results[m][metric_key] for m in model_names]
    bars = ax.bar(model_names, values, color=bar_colors, alpha=0.85,
                  edgecolor='white', width=0.5)
    ax.set_title(metric_name, fontweight='bold', fontsize=13)
    ax.set_ylim(min(values)*0.95, min(max(values)*1.05, 1.0))
    ax.set_ylabel('Score')
    for bar, val in zip(bars, values):
        ax.text(bar.get_x()+bar.get_width()/2., bar.get_height()+0.002,
                f'{val:.4f}', ha='center', fontweight='bold', fontsize=11)
    best_idx = values.index(max(values))
    bars[best_idx].set_edgecolor('gold')
    bars[best_idx].set_linewidth(3)

plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, '01_comparison.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"      ✅ 01_comparison.png")

# ── Figure 2 : Matrices de confusion ────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(20, 6))
fig.suptitle('Matrices de Confusion — Test Set (2020–2024)',
             fontsize=15, fontweight='bold')

for ax, name in zip(axes, model_names):
    cm     = results[name]['confusion_matrix']
    cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100
    sns.heatmap(cm_pct, annot=True, fmt='.1f', cmap='Blues', ax=ax,
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
                linewidths=0.5, linecolor='white',
                annot_kws={'size':11, 'weight':'bold'})
    title_color = 'darkorange' if name == best_name else 'black'
    ax.set_title(f'{name}\n(F1={results[name]["f1_macro"]:.3f})',
                 fontweight='bold', color=title_color)
    ax.set_xlabel('Prédit')
    ax.set_ylabel('Réel')

plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, '02_confusion_matrix.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"      ✅ 02_confusion_matrix.png")

# ── Figure 3 : Courbes ROC ───────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(20, 6))
fig.suptitle('Courbes ROC — One vs Rest', fontsize=15, fontweight='bold')

present_classes = np.unique(y_test)
for ax, name in zip(axes, model_names):
    y_proba = results[name]['y_pred_proba']
    for i, (cls_name, color) in enumerate(zip(CLASS_NAMES, RISK_COLORS)):
        if i not in present_classes:
            ax.plot([], [], color=color, lw=2, label=f'{cls_name} (absent du test)')
            continue
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        auc_cls = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
        ax.plot(fpr, tpr, color=color, lw=2, label=f'{cls_name} (AUC={auc_cls:.3f})')
    ax.plot([0,1],[0,1], 'k--', lw=1, alpha=0.5)
    ax.set_title(name, fontweight='bold',
                 color='darkorange' if name==best_name else 'black')
    ax.set_xlabel('Taux Faux Positifs')
    ax.set_ylabel('Taux Vrais Positifs')
    ax.legend(fontsize=9)

plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, '03_roc_curves.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"      ✅ 03_roc_curves.png")

# ── Figure 4 : Feature Importance ───────────────────────────────────
importances = best_model.feature_importances_
feat_imp    = pd.Series(importances, index=X_train.columns).sort_values(ascending=False)

fig, axes = plt.subplots(1, 2, figsize=(18, 8))
fig.suptitle(f'Importance des Features — {best_name}',
             fontsize=15, fontweight='bold')

top20       = feat_imp.head(20)
colors_bars = [COLORS['red'] if v > top20.quantile(0.75)
               else COLORS['orange'] if v > top20.quantile(0.5)
               else COLORS['blue'] for v in top20.values]
axes[0].barh(top20.index[::-1], top20.values[::-1],
             color=colors_bars[::-1], alpha=0.85, edgecolor='white')
axes[0].set_title('Top 20 Features', fontweight='bold')
axes[0].set_xlabel('Importance')

top5       = feat_imp.head(5)
pie_data   = list(top5.values) + [feat_imp[5:].sum()]
pie_labels = list(top5.index)  + ['Autres']
pie_colors = [COLORS['red'], COLORS['orange'], COLORS['blue'],
              COLORS['green'], COLORS['purple'], '#9CA3AF']
wedges, texts, autotexts = axes[1].pie(
    pie_data, labels=pie_labels, autopct='%1.1f%%',
    colors=pie_colors, startangle=90,
    wedgeprops={'edgecolor':'white','linewidth':2})
for at in autotexts:
    at.set_fontweight('bold')
axes[1].set_title('Top 5 vs Reste', fontweight='bold')

plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, '04_feature_importance.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"      ✅ 04_feature_importance.png")

# ── Figure 5 : F1 par classe ─────────────────────────────────────────
fig, ax = plt.subplots(figsize=(12, 6))
fig.suptitle('F1-Score par Classe — Comparaison des Modèles',
             fontsize=15, fontweight='bold')

x     = np.arange(len(CLASS_NAMES))
width = 0.25
for i, (name, color) in enumerate(zip(model_names, bar_colors)):
    f1s  = results[name]['f1_per_class']
    bars = ax.bar(x + i*width, f1s, width, label=name,
                  color=color, alpha=0.85, edgecolor='white')
    for bar, val in zip(bars, f1s):
        ax.text(bar.get_x()+bar.get_width()/2., bar.get_height()+0.005,
                f'{val:.2f}', ha='center', fontsize=9)

ax.set_xticks(x + width)
ax.set_xticklabels(CLASS_NAMES, fontsize=12)
ax.set_ylabel('F1-Score')
ax.set_ylim(0, 1.1)
ax.legend()
ax.axhline(0.5, color='gray', linestyle='--', alpha=0.5)

plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, '05_f1_par_classe.png'), dpi=150, bbox_inches='tight')
plt.close()
print(f"      ✅ 05_f1_par_classe.png")


# ════════════════════════════════════════════════════════════════════
# 5. SAUVEGARDE
# ════════════════════════════════════════════════════════════════════
print("\n[5/5] Sauvegarde...")

joblib.dump(best_model,    os.path.join(PIPE_DIR, 'best_model.pkl'))
joblib.dump(trained_models, os.path.join(PIPE_DIR, 'all_models.pkl'))

results_json = {
    name: {
        'accuracy':     float(r['accuracy']),
        'f1_macro':     float(r['f1_macro']),
        'f1_weighted':  float(r['f1_weighted']),
        'f1_per_class': [float(v) for v in r['f1_per_class']],
        'auc':          float(r['auc']),
    }
    for name, r in results.items()
}
results_json['best_model'] = best_name

with open(os.path.join(PIPE_DIR, 'model_results.json'), 'w') as f:
    json.dump(results_json, f, indent=2)

feat_imp_df = pd.DataFrame({'feature': feat_imp.index, 'importance': feat_imp.values})
feat_imp_df.to_csv(os.path.join(PIPE_DIR, 'feature_importances.csv'), index=False)

# Rapport texte
report_path = os.path.join(BASE_DIR, '2_ml', 'results.txt')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("=" * 55 + "\n  RAPPORT — MODÈLES ML\n" + "=" * 55 + "\n")
    for name in model_names:
        marker = " ← MEILLEUR" if name == best_name else ""
        f.write(f"\n{'─'*40}\n  {name}{marker}\n{'─'*40}\n")
        f.write(f"  Accuracy   : {results[name]['accuracy']:.4f}\n")
        f.write(f"  F1 Macro   : {results[name]['f1_macro']:.4f}\n")
        f.write(f"  F1 Weighted: {results[name]['f1_weighted']:.4f}\n")
        f.write(f"  AUC (OvR)  : {results[name]['auc']:.4f}\n")
        f.write(f"\n{results[name]['report']}\n")

print(f"      ✅ pipeline/best_model.pkl")
print(f"      ✅ pipeline/all_models.pkl")
print(f"      ✅ pipeline/model_results.json")
print(f"      ✅ pipeline/feature_importances.csv")
print(f"      ✅ 2_ml/results.txt")

print(f"""
{"=" * 55}
  🎉 ENTRAÎNEMENT TERMINÉ !
{"=" * 55}

  Résultats (Test Set 2020–2024) :
  ┌──────────────────┬──────────┬──────────┬──────────┐
  │ Modèle           │ Accuracy │ F1 Macro │   AUC    │
  ├──────────────────┼──────────┼──────────┼──────────┤""")

for name in model_names:
    r      = results[name]
    marker = " 🏆" if name == best_name else "   "
    print(f"  │ {(name+marker):<16} │  {r['accuracy']:.4f}  │  {r['f1_macro']:.4f}  │  {r['auc']:.4f}  │")

print(f"""  └──────────────────┴──────────┴──────────┴──────────┘

  🏆 Meilleur modèle : {best_name}
     Sauvegardé dans : pipeline/best_model.pkl

  Prochaine étape :
  → python 3_xai/1_shap.py
""")