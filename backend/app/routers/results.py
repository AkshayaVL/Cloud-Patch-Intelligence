from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/results", tags=["results"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("/{scan_id}")
def get_scan_results(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    findings = supabase.table("findings").select("*").eq(
        "scan_id", scan_id
    ).eq("user_id", user_id).execute()
    return findings.data


@router.get("/")
def get_all_findings(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    # Temporarily get ALL findings to debug
    findings = supabase.table("findings").select("*").order(
        "created_at", desc=True
    ).execute()
    return findings.data