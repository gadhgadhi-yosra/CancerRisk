from pathlib import Path
from typing import Optional

import joblib
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CancerRisk API", version="0.2.0")

MODEL_PATH = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "model.joblib"
_model = None


class RiskInput(BaseModel):
    age: int
    pollution: float
    smoking: float
    diet: float
    exercise: float
    alcohol: float
    urbanization: float
    bmi: float
    family_history: bool


class RiskOutput(BaseModel):
    risk_score: float
    label: str
    explanation: Optional[dict] = None


def load_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
    return _model


def label_from_score(score: float) -> str:
    if score < 25:
        return "Faible"
    if score < 50:
        return "Modéré"
    if score < 75:
        return "Élevé"
    return "Critique"


def predict_with_model(payload: RiskInput) -> RiskOutput:
    model = load_model()
    if model is None:
        # fallback mock
        return dummy_predict(payload)
    df = [payload.dict()]
    score = float(model.predict(df)[0])
    return RiskOutput(
        risk_score=round(score, 2),
        label=label_from_score(score),
        explanation={"note": "Sortie du modèle joblib", "model_path": str(MODEL_PATH)},
    )


def dummy_predict(payload: RiskInput) -> RiskOutput:
    score = (
        (payload.age - 20) * 0.4
        + payload.pollution * 0.5
        + payload.smoking * 2
        + (10 - payload.diet) * 1.5
        + max(0, 5 - payload.exercise) * 2
        + payload.alcohol * 0.8
        + payload.urbanization * 0.6
        + max(0, payload.bmi - 25) * 1.2
        + (12 if payload.family_history else 0)
    )
    score = max(0, min(100, round(score, 2)))
    return RiskOutput(
        risk_score=score,
        label=label_from_score(score),
        explanation={"note": "Scoring mock — modèle non chargé"},
    )


@app.get("/health")
def health():
    exists = MODEL_PATH.exists()
    return {"status": "ok", "model_loaded": load_model() is not None, "model_path": str(MODEL_PATH), "model_file_exists": exists}


@app.post("/predict", response_model=RiskOutput)
def predict(payload: RiskInput):
    return predict_with_model(payload)


# pour lancer en local:
# uvicorn app.main:app --reload --port 8000
