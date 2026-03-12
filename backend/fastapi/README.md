# Backend FastAPI (prototype)

Structure :
- `app/main.py` : endpoints `/health` et `/predict` (scoring mock à remplacer par votre modèle).
- `requirements.txt` : dépendances backend.

Installer et lancer en local :
```bash
cd backend/fastapi
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Remplacer le `dummy_predict` par votre pipeline entraîné (charger un modèle `joblib`/`pkl`, appliquer preprocessing, retourner score + explication SHAP si dispo).
