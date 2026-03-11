# 🧬 CancerRisk AI — Analyse & Prédiction des Risques de Cancer

Projet académique combinant Machine Learning, Explainable AI et interface React pour analyser et prédire les risques de cancer sur 50 ans de données.

---

## 👥 Équipe

| Membre | Rôle                             |
| ------ | -------------------------------- |
| Yosra  | Frontend (React)                 |
| Inès   | Business Intelligence (Power BI) |
| Fayfa  | IA — ML / XAI / Agent Génératif  |

---

## 🗂️ Structure du projet

```
CancerRisk/
│
├── data/                          ← Mets ton CSV ici (non versionné)
│   └── global_cancer_50years_extended_patient_level.csv
│
├── 1_eda/                         ← Étape 1 — Analyse exploratoire
│   ├── 1_eda_exploration.py       → Visualisations & statistiques
│   ├── 2_preprocessing.py         → Nettoyage & feature engineering
│   ├── 3_verification.py          → Sanity check avant ML
│   └── figures/                   → Graphiques générés automatiquement
│
├── 2_ml/                          ← Étape 2 — Modélisation ML
│   ├── 1_model_training.py        → Random Forest / XGBoost / LightGBM
│   └── figures/
│
├── 3_xai/                         ← Étape 3 — Explainable AI
│   ├── 1_shap.py                  → Explications SHAP
│   └── figures/
│
├── 4_agent/                       ← Étape 4 — Agent IA Génératif
│   └── 1_agent.py                 → Recommandations via LLM
│
├── pipeline/                      ← Modèles & pipeline sauvegardés (non versionné)
│
├── src/                           ← Frontend React
│   ├── pages/                     → Dashboard, RiskScore, XAI, Assistant…
│   ├── components/ui/             → Composants shadcn-ui (JSX)
│   └── lib/                       → Utilitaires et données simulées
│
├── requirements.txt               ← Dépendances Python
├── package.json                   ← Dépendances Node.js
└── README.md
```

---

## ⚙️ Installation

### Partie IA (Python)

```bash
pip install -r requirements.txt
```

### Partie Frontend (React)

```bash
npm install
npm run dev
```

Interface disponible sur http://localhost:8080

---

## 🚀 Ordre d'exécution — Partie IA

```bash
python 1_eda/1_eda_exploration.py     # Analyse exploratoire
python 1_eda/2_preprocessing.py       # Preprocessing & feature engineering
python 1_eda/3_verification.py        # Vérification
python 2_ml/1_model_training.py       # Entraînement des modèles
python 3_xai/1_shap.py                # Explications SHAP
python 4_agent/1_agent.py             # Agent génératif
```

## 🖥️ Commandes Frontend

```bash
npm run dev       # Développement
npm run build     # Build production
npm run preview   # Prévisualiser le build
npm run lint      # Linter
npm test          # Tests unitaires
```

---

## 🏗️ Architecture technique

| Couche   | Technologie                     |
| -------- | ------------------------------- |
| ML       | Scikit-learn, XGBoost, LightGBM |
| XAI      | SHAP                            |
| Agent IA | Claude API (Anthropic)          |
| Frontend | React + Vite + shadcn-ui        |
| BI       | Power BI                        |
