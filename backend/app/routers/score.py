from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/score", tags=["score"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.get("/latest")
def get_latest_score(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    score = supabase.table("security_scores").select("*").eq(
        "user_id", user_id
    ).order("calculated_at", desc=True).limit(1).execute()
    if score.data:
        return score.data[0]
    return {"score": 100, "message": "No scans yet"}


@router.get("/history")
def get_score_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()
    scores = supabase.table("security_scores").select("*").eq(
        "user_id", user_id
    ).order("calculated_at", desc=True).execute()
    return scores.data