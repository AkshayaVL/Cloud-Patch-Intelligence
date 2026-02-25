from fastapi import APIRouter, HTTPException, Depends
from app.dependencies import get_current_user
from app.services.agent import AgentOrchestrator
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/scan", tags=["scan"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/run")
def run_scan(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("sub")
    supabase = get_supabase()

    # Create scan record
    scan = supabase.table("scans").insert({
        "user_id": user_id,
        "status": "running"
    }).execute()
    scan_id = scan.data[0]["id"]

    try:
        agent = AgentOrchestrator(
            aws_access_key_id=body.get("aws_access_key_id"),
            aws_secret_access_key=body.get("aws_secret_access_key"),
            aws_region=body.get("aws_region", "us-east-1"),
            github_token=body.get("github_token"),
            github_repo=body.get("github_repo"),
            user_id=user_id
        )
        results = agent.run(scan_id)
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_scan_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    scans = supabase.table("scans").select("*").eq(
        "user_id", user_id
    ).order("started_at", desc=True).execute()
    return scans.data

@router.post("/connections/save")
def save_connections(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("sub")
    supabase = get_supabase()

    # Check if connection exists
    existing = supabase.table("connections").select("id").eq(
        "user_id", user_id
    ).execute()

    if existing.data:
        supabase.table("connections").update({
            "aws_access_key_id": body.get("aws_access_key_id"),
            "aws_secret_access_key": body.get("aws_secret_access_key"),
            "aws_region": body.get("aws_region", "us-east-1"),
            "github_token": body.get("github_token"),
            "github_repo": body.get("github_repo"),
        }).eq("user_id", user_id).execute()
    else:
        supabase.table("connections").insert({
            "user_id": user_id,
            "aws_access_key_id": body.get("aws_access_key_id"),
            "aws_secret_access_key": body.get("aws_secret_access_key"),
            "aws_region": body.get("aws_region", "us-east-1"),
            "github_token": body.get("github_token"),
            "github_repo": body.get("github_repo"),
        }).execute()

    return {"status": "saved"}