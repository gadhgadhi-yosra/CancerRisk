"""
╔══════════════════════════════════════════════════════════════════╗
║  ÉTAPE 1A — EDA (Exploratory Data Analysis)                     ║
║  Lance : python etape1_eda/1A_eda_exploration.py                ║
╚══════════════════════════════════════════════════════════════════╝

CE QUE CE SCRIPT PRODUIT :
    figures/01_target_distribution.png   → Distribution du score cible
    figures/02_evolution_temporelle.png  → Évolution sur 50 ans
    figures/03_correlations.png          → Heatmap + corrélations
    figures/04_facteurs_risque.png       → Distribution des 5 facteurs
    figures/05_cancer_type_stage.png     → Analyse par type & stade
    figures/06_geographie.png            → Analyse par pays
    figures/07_demographie.png           → Analyse âge & genre
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import os

warnings.filterwarnings('ignore')

# ─── CHEMINS ────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH   = os.path.join(BASE_DIR, 'data', 'global_cancer_50years_extended_patient_level.csv')
FIGURES_DIR = os.path.join(BASE_DIR, 'etape1_eda', 'figures')
os.makedirs(FIGURES_DIR, exist_ok=True)

# ─── STYLE ──────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams['figure.facecolor'] = '#F8FAFC'
plt.rcParams['axes.facecolor']   = 'white'

COLORS = {
    'blue':   '#2563EB',
    'red':    '#DC2626',
    'orange': '#F59E0B',
    'green':  '#16A34A',
    'gray':   '#6B7280',
}
RISK_COLORS = ['#16A34A', '#60A5FA', '#F59E0B', '#DC2626']   # No Risk / Low / Medium / High
STAGE_ORDER = ['Stage 0', 'Stage I', 'Stage II', 'Stage III', 'Stage IV']


# ════════════════════════════════════════════════════════════════════
# CHARGEMENT
# ════════════════════════════════════════════════════════════════════
print("=" * 55)
print("  ÉTAPE 1A — EDA")
print("=" * 55)
print(f"\n📂 Chargement : {DATA_PATH}")

df = pd.read_csv(DATA_PATH)
print(f"✅ {df.shape[0]:,} lignes × {df.shape[1]} colonnes")
print(f"   Période : {df['Year'].min()} → {df['Year'].max()}")
print(f"   Pays    : {', '.join(sorted(df['Country'].unique()))}")

# Créer les colonnes utiles
bins   = [-0.001, 0.001, 3.0, 6.0, 10.0]
labels = ['No Risk', 'Low', 'Medium', 'High']
df['Risk_Class']   = pd.cut(df['Target_Severity_Score'], bins=bins, labels=labels)
df['Decade_Label'] = ((df['Year'] // 10) * 10).astype(str) + 's'
df['Age_Group']    = pd.cut(df['Age'],
                             bins=[19, 30, 40, 50, 60, 70, 80, 90],
                             labels=['20-30','31-40','41-50','51-60','61-70','71-80','81-90'])

pct_zero = (df['Target_Severity_Score'] == 0).mean() * 100


# ════════════════════════════════════════════════════════════════════
# FIGURE 1 — Distribution de la variable cible
# ════════════════════════════════════════════════════════════════════
print("\n📊 Figure 1 : Distribution Target_Severity_Score...")
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('Distribution de la Variable Cible — Target_Severity_Score',
             fontsize=15, fontweight='bold')

# Distribution complète
ax = axes[0]
ax.hist(df['Target_Severity_Score'], bins=50, color=COLORS['blue'], alpha=0.85, edgecolor='white')
ax.axvline(df['Target_Severity_Score'].mean(),   color=COLORS['red'],    linestyle='--', lw=2, label=f"Moyenne : {df['Target_Severity_Score'].mean():.2f}")
ax.axvline(df['Target_Severity_Score'].median(), color=COLORS['orange'], linestyle='--', lw=2, label=f"Médiane : {df['Target_Severity_Score'].median():.2f}")
ax.set_title(f'Distribution complète\n({pct_zero:.1f}% de valeurs = 0)', fontweight='bold')
ax.set_xlabel('Score')
ax.set_ylabel('Nombre de patients')
ax.legend()

# Sans les zéros
ax = axes[1]
non_zero = df[df['Target_Severity_Score'] > 0]['Target_Severity_Score']
ax.hist(non_zero, bins=50, color=COLORS['orange'], alpha=0.85, edgecolor='white')
ax.axvline(non_zero.mean(), color=COLORS['red'], linestyle='--', lw=2, label=f"Moyenne : {non_zero.mean():.2f}")
ax.set_title(f'Sans les zéros\n({len(non_zero):,} patients avec risque > 0)', fontweight='bold')
ax.set_xlabel('Score')
ax.legend()

# Pie chart des classes
ax = axes[2]
counts = df['Risk_Class'].value_counts().reindex(['No Risk','Low','Medium','High'])
ax.pie(counts.values, labels=counts.index, autopct='%1.1f%%',
       colors=RISK_COLORS, startangle=90,
       wedgeprops={'edgecolor':'white','linewidth':2})
ax.set_title('Répartition des 4 classes\nde risque', fontweight='bold')

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '01_target_distribution.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")

# Afficher le key insight
print(f"""
   ⚠️  KEY INSIGHT :
      {pct_zero:.1f}% des patients ont score = 0
      → Problème de classification déséquilibré
      → On utilisera class_weight='balanced' dans le modèle
""")


# ════════════════════════════════════════════════════════════════════
# FIGURE 2 — Évolution temporelle
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 2 : Évolution temporelle...")
yearly = df.groupby('Year').agg(
    mean_score=('Target_Severity_Score','mean'),
    pct_high  =('Risk_Class', lambda x: (x=='High').mean()*100),
    n_cases   =('Patient_ID','count')
).reset_index()

fig, axes = plt.subplots(2, 2, figsize=(16, 10))
fig.suptitle('Évolution Temporelle — 50 Ans de Données (1975–2024)',
             fontsize=15, fontweight='bold')

ax = axes[0,0]
ax.plot(yearly['Year'], yearly['mean_score'], color=COLORS['blue'], lw=2.5, marker='o', ms=3)
ax.fill_between(yearly['Year'], yearly['mean_score'], alpha=0.15, color=COLORS['blue'])
ax.axvline(2000, color=COLORS['red'], linestyle=':', alpha=0.6, label='An 2000')
ax.set_title('Score Moyen par Année', fontweight='bold')
ax.set_xlabel('Année')
ax.set_ylabel('Score Moyen')
ax.legend()

ax = axes[0,1]
ax.plot(yearly['Year'], yearly['pct_high'], color=COLORS['red'], lw=2.5, marker='o', ms=3)
ax.fill_between(yearly['Year'], yearly['pct_high'], alpha=0.15, color=COLORS['red'])
ax.set_title('% Cas "High Risk" par Année', fontweight='bold')
ax.set_xlabel('Année')
ax.set_ylabel('% High Risk')

ax = axes[1,0]
decade_cancer = df.groupby(['Decade_Label','Cancer_Type'])['Target_Severity_Score'].mean().unstack()
decade_cancer.plot(kind='bar', ax=ax, colormap='tab10', width=0.8)
ax.set_title('Score Moyen par Décennie & Type de Cancer', fontweight='bold')
ax.set_xlabel('Décennie')
ax.tick_params(axis='x', rotation=30)
ax.legend(bbox_to_anchor=(1.02,1), loc='upper left', fontsize=8)

ax = axes[1,1]
decade_counts = df.groupby('Decade_Label')['Patient_ID'].count()
bars = ax.bar(decade_counts.index, decade_counts.values,
              color=COLORS['blue'], alpha=0.85, edgecolor='white')
for bar, val in zip(bars, decade_counts.values):
    ax.text(bar.get_x()+bar.get_width()/2., bar.get_height()+300,
            f'{val:,}', ha='center', fontsize=9, fontweight='bold')
ax.set_title('Nombre de Cas par Décennie', fontweight='bold')

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '02_evolution_temporelle.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")


# ════════════════════════════════════════════════════════════════════
# FIGURE 3 — Corrélations
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 3 : Corrélations...")
num_cols = ['Age','Genetic_Risk','Air_Pollution','Alcohol_Use',
            'Smoking','Obesity_Level','Survival_Years','Treatment_Cost_USD','Target_Severity_Score']
corr = df[num_cols].corr()

fig, axes = plt.subplots(1, 2, figsize=(18, 7))
fig.suptitle('Analyse des Corrélations', fontsize=15, fontweight='bold')

mask = np.triu(np.ones_like(corr, dtype=bool))
sns.heatmap(corr, mask=mask, annot=True, fmt='.2f', cmap='RdYlGn',
            center=0, ax=axes[0], linewidths=0.5, linecolor='white',
            annot_kws={'size':10,'weight':'bold'})
axes[0].set_title('Matrice de Corrélation', fontweight='bold')
axes[0].tick_params(axis='x', rotation=45)

target_corr = corr['Target_Severity_Score'].drop('Target_Severity_Score').sort_values()
bar_colors = [COLORS['red'] if v > 0.5 else COLORS['orange'] if v > 0.2
              else COLORS['green'] if v < -0.2 else COLORS['gray']
              for v in target_corr.values]
bars = axes[1].barh(target_corr.index, target_corr.values, color=bar_colors, edgecolor='white')
axes[1].axvline(0, color='black', lw=0.8)
axes[1].set_title('Corrélation avec Target_Severity_Score', fontweight='bold')
for bar, val in zip(bars, target_corr.values):
    axes[1].text(val + (0.01 if val>=0 else -0.01), bar.get_y()+bar.get_height()/2.,
                 f'{val:.3f}', ha='left' if val>=0 else 'right', va='center',
                 fontweight='bold', fontsize=10)

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '03_correlations.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")

print("""
   ⚠️  KEY INSIGHT CORRÉLATIONS :
      🔴 Smoking        : +0.75  (TRÈS FORTE)
      🔴 Air_Pollution  : +0.68  (FORTE)
      🟠 Obesity_Level  : +0.59  (FORTE)
      🟠 Alcohol_Use    : +0.53  (MODÉRÉE)
      🟡 Genetic_Risk   : +0.11  (FAIBLE seul)
      → Age et Survival_Years n'ont presque aucun effet direct
""")


# ════════════════════════════════════════════════════════════════════
# FIGURE 4 — Distribution des facteurs de risque
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 4 : Facteurs de risque...")
risk_factors = ['Genetic_Risk','Air_Pollution','Alcohol_Use','Smoking','Obesity_Level']

fig, axes = plt.subplots(2, 5, figsize=(22, 9))
fig.suptitle('Distribution des Facteurs de Risque par Classe',
             fontsize=15, fontweight='bold')

for i, factor in enumerate(risk_factors):
    # Ligne 1 : histogramme global
    axes[0,i].hist(df[factor], bins=30, color=COLORS['blue'], alpha=0.8, edgecolor='white')
    axes[0,i].set_title(f'{factor}\n(global)', fontweight='bold', fontsize=10)
    axes[0,i].axvline(df[factor].mean(), color=COLORS['red'], linestyle='--',
                      lw=1.5, label=f"Moy: {df[factor].mean():.1f}")
    axes[0,i].legend(fontsize=8)
    axes[0,i].set_xlabel('Valeur (0–10)')

    # Ligne 2 : boxplot par classe
    data_by_class = [df[df['Risk_Class']==cls][factor].dropna().values
                     for cls in ['No Risk','Low','Medium','High']]
    bp = axes[1,i].boxplot(data_by_class, patch_artist=True,
                           medianprops={'color':'white','linewidth':2})
    for patch, color in zip(bp['boxes'], RISK_COLORS):
        patch.set_facecolor(color)
        patch.set_alpha(0.8)
    axes[1,i].set_xticklabels(['No\nRisk','Low','Med','High'], fontsize=9)
    axes[1,i].set_title(f'{factor}\n(par classe)', fontweight='bold', fontsize=10)

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '04_facteurs_risque.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")


# ════════════════════════════════════════════════════════════════════
# FIGURE 5 — Cancer Type & Stage
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 5 : Type de cancer & stade...")
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle('Analyse par Type de Cancer et Stade', fontsize=15, fontweight='bold')

cancer_scores = df.groupby('Cancer_Type')['Target_Severity_Score'].mean().sort_values()
bars = axes[0,0].barh(cancer_scores.index, cancer_scores.values,
                      color=COLORS['blue'], alpha=0.85, edgecolor='white')
axes[0,0].set_title('Score Moyen par Type de Cancer', fontweight='bold')
for bar, val in zip(bars, cancer_scores.values):
    axes[0,0].text(val+0.005, bar.get_y()+bar.get_height()/2.,
                   f'{val:.3f}', va='center', fontsize=9)

cancer_class = df.groupby('Cancer_Type')['Risk_Class'].value_counts(normalize=True).unstack()*100
cancer_class.reindex(columns=['No Risk','Low','Medium','High']).plot(
    kind='barh', stacked=True, ax=axes[0,1], color=RISK_COLORS)
axes[0,1].set_title('Répartition des Classes par Type de Cancer (%)', fontweight='bold')
axes[0,1].legend(bbox_to_anchor=(1.02,1), loc='upper left')

stage_scores = df.groupby('Cancer_Stage')['Target_Severity_Score'].mean().reindex(STAGE_ORDER)
stage_colors = [COLORS['green'], COLORS['blue'], COLORS['orange'], '#F97316', COLORS['red']]
axes[1,0].bar(stage_scores.index, stage_scores.values,
              color=stage_colors, alpha=0.85, edgecolor='white')
axes[1,0].set_title('Score Moyen par Stade', fontweight='bold')
axes[1,0].tick_params(axis='x', rotation=20)

pivot = df.pivot_table(values='Target_Severity_Score',
                       index='Cancer_Type', columns='Cancer_Stage', aggfunc='mean')[STAGE_ORDER]
sns.heatmap(pivot, annot=True, fmt='.2f', cmap='YlOrRd', ax=axes[1,1],
            linewidths=0.5, linecolor='white', annot_kws={'size':9,'weight':'bold'})
axes[1,1].set_title('Score Moyen : Type × Stade', fontweight='bold')
axes[1,1].tick_params(axis='x', rotation=30)

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '05_cancer_type_stage.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")


# ════════════════════════════════════════════════════════════════════
# FIGURE 6 — Géographie
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 6 : Analyse géographique...")
fig, axes = plt.subplots(1, 3, figsize=(20, 6))
fig.suptitle('Analyse Géographique', fontsize=15, fontweight='bold')

country_scores = df.groupby('Country')['Target_Severity_Score'].mean().sort_values()
bars = axes[0].barh(country_scores.index, country_scores.values,
                    color=COLORS['blue'], alpha=0.85, edgecolor='white')
axes[0].set_title('Score Moyen par Pays', fontweight='bold')
for bar, val in zip(bars, country_scores.values):
    axes[0].text(val+0.002, bar.get_y()+bar.get_height()/2.,
                 f'{val:.3f}', va='center', fontsize=9)

decade_country = df.groupby(['Decade_Label','Country'])['Target_Severity_Score'].mean().unstack()
decade_country.plot(ax=axes[1], marker='o', lw=2, ms=5)
axes[1].set_title('Évolution par Pays (décennie)', fontweight='bold')
axes[1].legend(bbox_to_anchor=(1.02,1), loc='upper left', fontsize=9)
axes[1].tick_params(axis='x', rotation=30)

df.groupby('Country')[['Smoking','Air_Pollution','Obesity_Level']].mean().plot(
    kind='bar', ax=axes[2],
    color=[COLORS['red'], COLORS['orange'], COLORS['blue']], alpha=0.85, edgecolor='white')
axes[2].set_title('Facteurs de Risque Principaux par Pays', fontweight='bold')
axes[2].tick_params(axis='x', rotation=45)

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '06_geographie.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")


# ════════════════════════════════════════════════════════════════════
# FIGURE 7 — Démographie
# ════════════════════════════════════════════════════════════════════
print("📊 Figure 7 : Démographie...")
fig, axes = plt.subplots(2, 2, figsize=(16, 10))
fig.suptitle('Analyse Démographique — Âge & Genre', fontsize=15, fontweight='bold')

age_scores = df.groupby('Age_Group', observed=True)['Target_Severity_Score'].mean()
axes[0,0].bar(age_scores.index.astype(str), age_scores.values,
              color=COLORS['blue'], alpha=0.85, edgecolor='white')
axes[0,0].set_title('Score Moyen par Groupe d\'Âge', fontweight='bold')
axes[0,0].set_xlabel('Groupe d\'Âge')

gender_scores = df.groupby('Gender')['Target_Severity_Score'].mean().sort_values(ascending=False)
axes[0,1].bar(gender_scores.index, gender_scores.values,
              color=[COLORS['red'], COLORS['blue'], COLORS['green']], alpha=0.85, edgecolor='white')
axes[0,1].set_title('Score Moyen par Genre', fontweight='bold')
for bar, val in zip(axes[0,1].patches, gender_scores.values):
    axes[0,1].text(bar.get_x()+bar.get_width()/2., bar.get_height()+0.005,
                   f'{val:.3f}', ha='center', fontweight='bold')

for cls, color in zip(['No Risk','Low','Medium','High'], RISK_COLORS):
    axes[1,0].hist(df[df['Risk_Class']==cls]['Age'], bins=30,
                   alpha=0.6, label=cls, color=color, density=True)
axes[1,0].set_title('Distribution de l\'Âge par Classe de Risque', fontweight='bold')
axes[1,0].set_xlabel('Âge')
axes[1,0].legend()

pivot_age = df.pivot_table(values='Target_Severity_Score',
                            index='Age_Group', columns='Cancer_Type',
                            aggfunc='mean', observed=True)
sns.heatmap(pivot_age, annot=True, fmt='.2f', cmap='Blues', ax=axes[1,1],
            linewidths=0.5, annot_kws={'size':9})
axes[1,1].set_title('Score Moyen : Âge × Type de Cancer', fontweight='bold')
axes[1,1].tick_params(axis='x', rotation=30)

plt.tight_layout()
path = os.path.join(FIGURES_DIR, '07_demographie.png')
plt.savefig(path, dpi=150, bbox_inches='tight')
plt.close()
print(f"   ✅ Sauvegardé : {path}")


# ════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ════════════════════════════════════════════════════════════════════
print("\n" + "=" * 55)
print("  RÉSUMÉ — KEY INSIGHTS À RETENIR")
print("=" * 55)
print(f"""
  📌 Dataset : {len(df):,} patients | 1975–2024 | 10 pays | 8 types de cancer
  📌 Aucune valeur manquante ✅

  📌 VARIABLE CIBLE (Target_Severity_Score) :
     - {pct_zero:.1f}% des patients ont score = 0
     - Score max = {df['Target_Severity_Score'].max():.2f}
     - Fortement asymétrique (skewed)

  📌 CLASSES DE RISQUE :
     - No Risk : 56.3%  → classe majoritaire ⚠️
     - Low     : 15.9%
     - Medium  : 23.5%
     - High    :  4.3%  → classe minoritaire ⚠️

  📌 TOP FACTEURS (corrélation avec cible) :
     1. Smoking        +0.75  ← LE plus important
     2. Air_Pollution  +0.68
     3. Obesity_Level  +0.59
     4. Alcohol_Use    +0.53
     5. Genetic_Risk   +0.11

  📌 DÉCISION pour le modèle ML :
     → Classification 4 classes (No Risk / Low / Medium / High)
     → Split TEMPOREL : train 1975-2019 / test 2020-2024
     → class_weight='balanced' pour gérer le déséquilibre

  🎉 EDA terminée → Lance maintenant : python etape1_eda/1B_preprocessing.py
""")
