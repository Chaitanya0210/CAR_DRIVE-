from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(
    title="GroupDrive AI Engine",
    description="FastAPI service for demand forecasting and reverse-auction anomaly detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "groupdrive-ai-service",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/")
def read_root():
    return {"message": "GroupDrive AI Service operational"}
