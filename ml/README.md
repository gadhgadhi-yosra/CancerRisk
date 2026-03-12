# ML workspace

But : entraîner un modèle de scoring (ou séries temporelles) puis l'exposer via l'API FastAPI.

Arborescence :
- `notebooks/` : EDA, feature engineering.
- `src/train.py` : script d'entraînement (GradientBoosting régression) sur `data/global_cancer_50years_extended_patient_level.csv`.
- `artifacts/` : sortie des modèles (`model.joblib`).
- `requirements.txt` : dépendances ML.

Usage rapide :
```bash
cd ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python src/train.py
```
Le script logge MAE/RMSE et enregistre `artifacts/model.joblib`.

EDA avec Jupyter :
```bash
cd ml
source .venv/bin/activate
jupyter lab
```
Puis ouvrir `notebooks/eda.ipynb` et exécuter toutes les cellules.

Nettoyage des données :
```bash
cd ml
source .venv/bin/activate   # après création de la venv
python src/clean_dataset.py --infile ../data/global_cancer_50years_extended_patient_level.csv --outfile ../data/global_cancer_clean.csv
```

Prochaines étapes :
- MLflow (optionnel) : `pip install mlflow==2.11.3` dans la venv puis `mlflow ui --backend-store-uri mlruns/`.
- Ajouter SHAP pour les explications locales/globales.
- Affiner features (sélection de colonnes pertinentes, agrégations régionales, split temporel).
- Brancher le modèle dans `backend/fastapi/app/main.py` (charger `model.joblib` et appliquer le preprocess).
