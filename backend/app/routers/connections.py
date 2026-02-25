from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/connections", tags=["connections"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/save")
def save_connections(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("sub")
    supabase = get_supabase()

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


@router.get("/get")
def get_connections(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    result = supabase.table("connections").select(
        "id, aws_access_key_id, aws_region, github_repo, created_at"
    ).eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]
    return {}