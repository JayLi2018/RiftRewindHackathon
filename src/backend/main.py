# src/backend/main.py
import os
import json
import uuid
import boto3
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
# Load environment variables
load_dotenv()



from compare import compare_player_to_rank



# Get environment vars
BEDROCK_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_AGENT_ID = os.getenv("BEDROCK_AGENT_ID")
BEDROCK_AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID")
BUCKET_NAME = os.getenv("BUCKET_NAME", "bucket-for-actual-project")
S3_PREFIX_ROOT = os.getenv("S3_PREFIX_ROOT", "csv_data/parsed_match_data")
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
# Initialize Bedrock Agent Runtime client
bedrock_agent = boto3.client("bedrock-agent-runtime", region_name=BEDROCK_REGION)

app = FastAPI()

# Allow your frontend (Vite dev server) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
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

class CoachRequest(BaseModel):
    comparison_json: dict  # the raw output from /compare

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

@app.post("/coach")
def coach(req: CoachRequest):
    if not (BEDROCK_AGENT_ID and BEDROCK_AGENT_ALIAS_ID):
        raise HTTPException(status_code=500, detail="Bedrock Agent IDs not configured")

    # This is exactly what your frontend sent you
    comparison_str = json.dumps(req.comparison_json, indent=2)

    # Minimal input – let the Agent’s own prompt handle the instructions
    user_message = (
        "Here is a JSON comparison between a player and a target rank.\n"
        "Use your existing instructions to analyze it and give coaching tips.\n\n"
        f"{comparison_str}"
    )

    try:
        resp = bedrock_agent.invoke_agent(
            agentId=BEDROCK_AGENT_ID,
            agentAliasId=BEDROCK_AGENT_ALIAS_ID,
            sessionId=str(uuid.uuid4()),
            inputText=user_message,
        )

        chunks: list[str] = []
        for event in resp["completion"]:
            if "chunk" in event:
                chunks.append(event["chunk"]["bytes"].decode("utf-8"))
        answer = "".join(chunks)

        return {"coach_text": answer}

    except Exception as e:
        print("Bedrock error:", e)
        raise HTTPException(status_code=500, detail="Failed to call Bedrock Agent")