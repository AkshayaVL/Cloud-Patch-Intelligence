from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.config import settings
from supabase import create_client
from github import Github

router = APIRouter(prefix="/prs", tags=["prs"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def sync_pr_statuses(user_id: str, prs: list, supabase) -> list:
    """Sync PR status from GitHub for all PRs that might have changed."""
    if not prs:
        return prs

    # Get user's GitHub token from connections
    conn = supabase.table("connections").select(
        "github_token, github_repo"
    ).eq("user_id", user_id).execute()

    if not conn.data or not conn.data[0].get("github_token"):
        return prs  # No token, return as-is

    github_token = conn.data[0].get("github_token")

    try:
        g = Github(github_token)
        updated_prs = []

        for pr in prs:
            pr_url = pr.get("pr_url", "")
            pr_number = pr.get("pr_number")
            current_status = pr.get("status", "open")

            # Only sync PRs that are still "open" in our DB
            # (merged/closed won't change back)
            if current_status != "open" or not pr_number or not pr_url:
                updated_prs.append(pr)
                continue

            try:
                # Extract repo from PR URL
                # e.g. https://github.com/AkshayaVL/cpi-terraform-fixes/pull/9
                parts = pr_url.replace("https://github.com/", "").split("/")
                repo_name = f"{parts[0]}/{parts[1]}"

                repo = g.get_repo(repo_name)
                github_pr = repo.get_pull(int(pr_number))

                # Map GitHub state to our status
                if github_pr.merged:
                    new_status = "merged"
                elif github_pr.state == "closed":
                    new_status = "closed"
                else:
                    new_status = "open"

                # Update DB if status changed
                if new_status != current_status:
                    supabase.table("pull_requests").update(
                        {"status": new_status}
                    ).eq("id", pr["id"]).execute()
                    pr["status"] = new_status

            except Exception as e:
                print(f"Failed to sync PR #{pr_number}: {e}")

            updated_prs.append(pr)

        return updated_prs

    except Exception as e:
        print(f"GitHub sync error: {e}")
        return prs  # Return original if sync fails


@router.get("/")
def get_all_prs(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    supabase = get_supabase()

    prs = supabase.table("pull_requests").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).execute()

    # Sync statuses from GitHub before returning
    synced_prs = sync_pr_statuses(user_id, prs.data, supabase)
    return synced_prs