from fastapi import APIRouter, HTTPException, Depends
from app.dependencies import get_current_user
from app.services.aws_scanner import AWSScanner
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/scan", tags=["scan"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/test-connection")
def test_aws_connection(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    scanner = AWSScanner(
        access_key_id=body.get("aws_access_key_id"),
        secret_access_key=body.get("aws_secret_access_key"),
        region=body.get("aws_region", "us-east-1")
    )
    connected = scanner.test_connection()
    if not connected:
        raise HTTPException(status_code=400, detail="AWS connection failed. Check your credentials.")
    return {"status": "connected", "message": "AWS credentials are valid"}


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
        scanner = AWSScanner(
            access_key_id=body.get("aws_access_key_id"),
            secret_access_key=body.get("aws_secret_access_key"),
            region=body.get("aws_region", "us-east-1")
        )

        # Run the scan
        results = scanner.run_full_scan()
        findings = results["findings"]
        counts = results["severity_counts"]

        # Save findings to DB
        for f in findings:
            supabase.table("findings").insert({
                "scan_id": scan_id,
                "user_id": user_id,
                "resource_id": f["resource_id"],
                "resource_type": f["resource_type"],
                "check_id": f["check_id"],
                "check_title": f["check_title"],
                "severity": f["severity"],
                "pr_status": "pending"
            }).execute()

        # Update scan status
        supabase.table("scans").update({
            "status": "completed",
            "total_issues": results["total"],
            "critical_count": counts["CRITICAL"],
            "high_count": counts["HIGH"],
            "medium_count": counts["MEDIUM"],
            "low_count": counts["LOW"],
        }).eq("id", scan_id).execute()

        return {
            "scan_id": scan_id,
            "status": "completed",
            "total_issues": results["total"],
            "severity_counts": counts,
            "findings": findings
        }

    except Exception as e:
        supabase.table("scans").update({
            "status": "failed",
            "error_message": str(e)
        }).eq("id", scan_id).execute()

        raise HTTPException(status_code=500, detail=str(e))