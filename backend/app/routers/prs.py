from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/prs", tags=["prs"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("/")
def get_all_prs(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    prs = supabase.table("pull_requests").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).execute()
    return prs.data