# src/backend/main.py

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from compare import compare_player_to_rank

# Bucket + prefix you’re already using
BUCKET_NAME = os.getenv("BUCKET_NAME", "bucket-for-actual-project")
S3_PREFIX_ROOT = "csv_data/parsed_match_data"

app = FastAPI()

# Allow your frontend (Vite dev server) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompareRequest(BaseModel):
    riot_id: str
    region: str = "na1"          # was platform before
    tier: str                    # e.g. "DIAMOND"
    division: Optional[str] = None  # e.g. "II"
    n_recent: int = 20           # number of recent games to analyze
    primary_role: Optional[str] = None  # e.g. "Mid", "Jungle"
    champion: Optional[str] = None      # e.g. "Akshan"


@app.post("/compare")
def compare_endpoint(req: CompareRequest):
    """
    Bridge between frontend JSON and compare_player_to_rank().
    """
    try:
        result = compare_player_to_rank(
            riot_id=req.riot_id,
            region=req.region,          # <-- use region, not platform
            tier=req.tier,
            division=req.division,
            n_recent=req.n_recent,
            primary_role=req.primary_role,
            champion=req.champion,
            bucket=BUCKET_NAME,
            s3_prefix_root=S3_PREFIX_ROOT,
        )
        return result
    except Exception as e:
        # Surface the message to the frontend
        raise HTTPException(status_code=500, detail=str(e))