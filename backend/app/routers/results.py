from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/results", tags=["results"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("/compare")
def compare_scans(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()

    # Get last 2 completed scans
    scans = supabase.table("scans").select("*").eq(
        "user_id", user_id
    ).eq("status", "completed").order(
        "started_at", desc=True
    ).limit(2).execute()

    if not scans.data or len(scans.data) < 2:
        return {"enough_data": False, "message": "Need at least 2 completed scans to compare"}

    current_scan = scans.data[0]
    previous_scan = scans.data[1]

    # Get findings for each scan
    current_findings = supabase.table("findings").select("*").eq(
        "scan_id", current_scan["id"]
    ).eq("user_id", user_id).execute().data

    previous_findings = supabase.table("findings").select("*").eq(
        "scan_id", previous_scan["id"]
    ).eq("user_id", user_id).execute().data

    # Get scores for each scan
    current_score_row = supabase.table("security_scores").select("score").eq(
        "scan_id", current_scan["id"]
    ).execute().data
    previous_score_row = supabase.table("security_scores").select("score").eq(
        "scan_id", previous_scan["id"]
    ).execute().data

    current_score = current_score_row[0]["score"] if current_score_row else 100
    previous_score = previous_score_row[0]["score"] if previous_score_row else 100

    # Compare findings by check_id + resource_id (unique fingerprint)
    def fingerprint(f):
        return f"{f.get('check_id')}::{f.get('resource_id')}"

    current_fps = {fingerprint(f): f for f in current_findings}
    previous_fps = {fingerprint(f): f for f in previous_findings}

    new_findings = [f for fp, f in current_fps.items() if fp not in previous_fps]
    resolved_findings = [f for fp, f in previous_fps.items() if fp not in current_fps]
    persisted_findings = [f for fp, f in current_fps.items() if fp in previous_fps]

    # Severity counts
    def count_severities(findings_list):
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in findings_list:
            sev = f.get("severity", "LOW").upper()
            if sev in counts:
                counts[sev] += 1
        return counts

    return {
        "enough_data": True,
        "current": {
            "scan_id": current_scan["id"],
            "date": current_scan["started_at"],
            "score": current_score,
            "total": len(current_findings),
            "severity_counts": count_severities(current_findings),
        },
        "previous": {
            "scan_id": previous_scan["id"],
            "date": previous_scan["started_at"],
            "score": previous_score,
            "total": len(previous_findings),
            "severity_counts": count_severities(previous_findings),
        },
        "diff": {
            "score_change": current_score - previous_score,
            "new_count": len(new_findings),
            "resolved_count": len(resolved_findings),
            "persisted_count": len(persisted_findings),
            "new_findings": new_findings[:5],       # top 5 for preview
            "resolved_findings": resolved_findings[:5],
        }
    }


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
    findings = supabase.table("findings").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).execute()
    return findings.data