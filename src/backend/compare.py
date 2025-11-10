"""
High-level comparison utilities.

Designed to match the JSON payload you send from the frontend:

{
  "riot_id": "gracexing#NA1",
  "region": "na1",
  "tier": "DIAMOND",
  "division": "II",
  "n_recent": 20,
  "primary_role": "MIDDLE",
  "champion": "Akshan"
}

Usage example (local):

export RIOT_API_KEY="RGAPI-xxxx"
export BUCKET_NAME="bucket-for-actual-project"

python compare.py
"""

import os
import io
import json
from typing import Dict, Any, List, Optional

import boto3
import pandas as pd
import urllib3

# ---------- Config ----------

RIOT_API_KEY = os.getenv("RIOT_API_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "bucket-for-actual-project")

HTTP = urllib3.PoolManager(num_pools=8, maxsize=16)
S3 = boto3.client("s3")

# queue 420 = Ranked Solo/Duo
SOLO_QUEUE_ID = 420

# role alias map so we can be forgiving ("Mid" -> "MIDDLE", "ADC" -> "BOTTOM", etc.)
ROLE_ALIASES = {
    "TOP": "TOP",
    "JUNGLE": "JUNGLE",
    "MID": "MIDDLE",
    "MIDDLE": "MIDDLE",
    "ADC": "BOTTOM",
    "BOT": "BOTTOM",
    "BOTTOM": "BOTTOM",
    "SUPPORT": "UTILITY",
    "SUP": "UTILITY",
    "UTILITY": "UTILITY",
}


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    key = role.upper()
    return ROLE_ALIASES.get(key, key)


# ---------- Riot helpers ----------

def platform_to_regional(platform: str) -> str:
    platform = platform.lower()
    return {
        "na1": "americas",
        "br1": "americas",
        "la1": "americas",
        "la2": "americas",
        "euw1": "europe",
        "eun1": "europe",
        "tr1": "europe",
        "ru": "europe",
        "kr": "asia",
        "jp1": "asia",
        "oc1": "sea",
        "ph2": "sea",
        "sg2": "sea",
        "th2": "sea",
        "tw2": "sea",
        "vn2": "sea",
    }.get(platform, "americas")


def riot_get_json(url: str) -> Any:
    if not RIOT_API_KEY:
        raise RuntimeError("RIOT_API_KEY env var not set")

    headers = {"X-Riot-Token": RIOT_API_KEY}
    r = HTTP.request("GET", url, headers=headers)
    if r.status != 200:
        body = r.data.decode("utf-8", errors="ignore")[:300]
        raise RuntimeError(f"Riot API {r.status}: {body}")
    return json.loads(r.data.decode("utf-8"))


def get_puuid_from_riot_id(riot_id: str, platform: str = "na1") -> Dict[str, str]:
    """
    riot_id: 'GameName#TAG' e.g. 'GraceXing#NA1'
    returns: {'puuid': ..., 'gameName': ..., 'tagLine': ...}
    """
    if "#" not in riot_id:
        raise ValueError('Riot ID must be "GameName#TAG"')

    game_name, tag = riot_id.split("#", 1)
    regional = platform_to_regional(platform)
    from urllib.parse import quote

    url = (
        f"https://{regional}.api.riotgames.com/riot/account/v1/accounts/"
        f"by-riot-id/{quote(game_name)}/{quote(tag)}"
    )
    data = riot_get_json(url)
    return {
        "puuid": data["puuid"],
        "gameName": data.get("gameName", game_name),
        "tagLine": data.get("tagLine", tag),
    }


def get_player_ranked_matches(
    puuid: str,
    platform: str = "na1",
    max_matches: int = 20,
    queue_id: int = SOLO_QUEUE_ID,
) -> List[str]:
    regional = platform_to_regional(platform)
    url = (
        f"https://{regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/"
        f"{puuid}/ids?start=0&count={max_matches}&queue={queue_id}"
    )
    return riot_get_json(url)


def extract_player_row_from_match(match_id: str, puuid: str) -> Dict[str, Any]:
    """
    Returns a dict with *the same columns* as your CSVs
    for this player in this match.
    """
    # For now we assume NA1 -> americas; if you expand to other regions,
    # pass platform/region explicitly instead of hardcoding.
    regional_host = platform_to_regional("na1")

    url = (
        f"https://{regional_host}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    )
    match_data = riot_get_json(url)
    info = match_data["info"]
    meta = match_data["metadata"]

    player = None
    for p in info["participants"]:
        if p.get("puuid") == puuid:
            player = p
            break
    if player is None:
        raise RuntimeError(f"PUUID not found in match {match_id}")

    total_minions = player.get("totalMinionsKilled", 0)
    neutral_minions = player.get("neutralMinionsKilled", 0)

    row = {
        "tier": None,  # we'll fill rank context separately
        "individualPosition": player.get("individualPosition"),
        "championName": player.get("championName"),
        "matchId": meta.get("matchId"),
        "gameDuration": info.get("gameDuration"),
        "gameMode": info.get("gameMode"),
        "queueId": info.get("queueId"),
        "championId": player.get("championId"),
        "teamPosition": player.get("teamPosition"),
        "kills": player.get("kills", 0),
        "deaths": player.get("deaths", 0),
        "assists": player.get("assists", 0),
        "totalMinionsKilled": total_minions,
        "neutralMinionsKilled": neutral_minions,
        "goldEarned": player.get("goldEarned", 0),
        "totalDamageDealtToChampions": player.get("totalDamageDealtToChampions", 0),
        "totalDamageTaken": player.get("totalDamageTaken", 0),
        "visionScore": player.get("visionScore", 0),
        "win": player.get("win", False),
        "items": [player.get(f"item{i}") for i in range(7)],
        "summoner1Id": player.get("summoner1Id"),
        "summoner2Id": player.get("summoner2Id"),
    }
    return row


def get_player_dataset(
    riot_id: str, platform: str = "na1", max_matches: int = 20
) -> pd.DataFrame:
    """Return a DataFrame of this player's recent ranked solo matches."""
    acc = get_puuid_from_riot_id(riot_id, platform)
    puuid = acc["puuid"]
    match_ids = get_player_ranked_matches(puuid, platform, max_matches=max_matches)

    rows = []
    for mid in match_ids:
        try:
            rows.append(extract_player_row_from_match(mid, puuid))
        except Exception as e:
            print(f"[warn] skipping match {mid}: {e}")
    if not rows:
        raise RuntimeError("No valid matches fetched for this player.")
    return pd.DataFrame(rows)


# ---------- S3 rank dataset helpers ----------

def load_rank_dataset_from_s3(
    bucket: str,
    tier: str,
    division: Optional[str],
    prefix_root: str = "csv_data/parsed_match_data",
) -> pd.DataFrame:
    """
    Loads all CSV parts for a given tier/division from S3 into one DataFrame.

    Expected S3 layout (from your screenshot):
      csv_data/parsed_match_data/DIAMOND/II/data_DIAMOND_II_part0.csv

    For now we require a division (e.g. "IV", "III", "II", "I") for sub-master tiers.
    """
    tier = tier.upper()
    if not division:
        raise RuntimeError("division is required for this dataset layout")
    division = division.upper()

    prefix = f"{prefix_root}/{tier}/{division}/"

    resp = S3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    contents = resp.get("Contents", [])
    if not contents:
        raise RuntimeError(f"No objects found under s3://{bucket}/{prefix}")

    dfs = []
    for obj in contents:
        key = obj["Key"]
        if not key.endswith(".csv"):
            continue
        obj_resp = S3.get_object(Bucket=bucket, Key=key)
        body = obj_resp["Body"].read()
        df = pd.read_csv(io.BytesIO(body))
        dfs.append(df)

    if not dfs:
        raise RuntimeError(f"No CSV files found under s3://{bucket}/{prefix}")
    return pd.concat(dfs, ignore_index=True)


# ---------- Aggregation / comparison ----------

def add_derived_stats(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    minutes = df["gameDuration"] / 60.0
    cs = df["totalMinionsKilled"] + df["neutralMinionsKilled"]

    df["cs"] = cs
    df["cs_per_min"] = cs / minutes
    df["gold_per_min"] = df["goldEarned"] / minutes
    df["dmg_per_min"] = df["totalDamageDealtToChampions"] / minutes
    df["vision_per_min"] = df["visionScore"] / minutes
    deaths = df["deaths"].replace(0, 1)
    df["kda"] = (df["kills"] + df["assists"]) / deaths
    df["win_numeric"] = df["win"].astype(int)
    return df


def summarize_group(df: pd.DataFrame) -> Dict[str, float]:
    """
    Returns mean stats for a dataset (could be rank-wide or player-only).
    """
    df = add_derived_stats(df)
    summary = {
        "games": float(len(df)),
        "avg_kills": df["kills"].mean(),
        "avg_deaths": df["deaths"].mean(),
        "avg_assists": df["assists"].mean(),
        "avg_kda": df["kda"].mean(),
        "win_rate": df["win_numeric"].mean(),  # 0~1
        "avg_cs_per_min": df["cs_per_min"].mean(),
        "avg_gold_per_min": df["gold_per_min"].mean(),
        "avg_dmg_per_min": df["dmg_per_min"].mean(),
        "avg_vision_per_min": df["vision_per_min"].mean(),
    }
    return summary


def compare_player_to_rank(
    riot_id: str,
    region: str,
    tier: str,
    division: Optional[str],
    n_recent: int = 20,
    primary_role: Optional[str] = None,
    champion: Optional[str] = None,
    bucket: Optional[str] = None,
    s3_prefix_root: str = "csv_data/parsed_match_data",
) -> Dict[str, Any]:
    """
    High-level function used by the FastAPI endpoint.

    - Loads rank dataset from S3 for (tier, division)
    - Fetches player's recent ranked solo games from Riot
    - Optionally filters both datasets by role (teamPosition) and champion
    - Returns a dict ready to JSON-ify.
    """
    if bucket is None:
        bucket = BUCKET_NAME

    tier_upper = tier.upper()

    # 1) Load rank dataset for that tier/division
    rank_df = load_rank_dataset_from_s3(
        bucket=bucket,
        tier=tier_upper,
        division=division,
        prefix_root=s3_prefix_root,
    )

    # 2) Fetch player dataset (n_recent ranked solo games)
    player_df = get_player_dataset(riot_id, platform=region, max_matches=n_recent)

    # 3) Optional filters: role & champion
    role_key = normalize_role(primary_role)

    if role_key:
        # filter by teamPosition if present
        if "teamPosition" in rank_df.columns:
            rank_df = rank_df[
                rank_df["teamPosition"].astype(str).str.upper() == role_key
            ]
        if "teamPosition" in player_df.columns:
            player_df = player_df[
                player_df["teamPosition"].astype(str).str.upper() == role_key
            ]

    if champion:
        champ_lower = champion.lower()
        if "championName" in rank_df.columns:
            rank_df = rank_df[
                rank_df["championName"].astype(str).str.lower() == champ_lower
            ]
        if "championName" in player_df.columns:
            player_df = player_df[
                player_df["championName"].astype(str).str.lower() == champ_lower
            ]

    if rank_df.empty:
        raise RuntimeError("Rank dataset is empty after filters.")
    if player_df.empty:
        raise RuntimeError("Player dataset is empty after filters.")

    # 4) Summaries
    rank_summary = summarize_group(rank_df)
    player_summary = summarize_group(player_df)

    # 5) Differences (player - rank)
    diff_summary = {
        key: player_summary[key] - rank_summary[key]
        for key in player_summary
        if key in rank_summary and key != "games"
    }

    return {
        "riot_id": riot_id,
        "region": region,
        "tier": tier_upper,
        "division": division,
        "primary_role": role_key,
        "champion": champion,
        "player_games": player_summary["games"],
        "rank_games": rank_summary["games"],
        "player_summary": player_summary,
        "rank_summary": rank_summary,
        "delta": diff_summary,
    }


# ---------- CLI demo ----------

if __name__ == "__main__":
    # Example: compare GraceXing#NA1 to DIAMOND II
    result = compare_player_to_rank(
        riot_id="GraceXing#NA1",
        region="na1",
        tier="DIAMOND",
        division="II",
        n_recent=20,
        primary_role="MIDDLE",
        champion=None,
        bucket=BUCKET_NAME,
        s3_prefix_root="csv_data/parsed_match_data",
    )
    import pprint

    pprint.pp(result)