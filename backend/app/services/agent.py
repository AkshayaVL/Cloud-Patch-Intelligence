from app.services.aws_scanner import AWSScanner
from app.services.llm_engine import LLMEngine
from app.services.github_pr import GitHubPRCreator
from app.config import settings
from supabase import create_client
from typing import Callable


class AgentOrchestrator:
    def __init__(
        self,
        aws_access_key_id: str,
        aws_secret_access_key: str,
        aws_region: str,
        github_token: str,
        github_repo: str,
        user_id: str,
        progress_callback: Callable = None
    ):
        self.scanner = AWSScanner(aws_access_key_id, aws_secret_access_key, aws_region)
        self.llm = LLMEngine()
        self.github = GitHubPRCreator(github_token, github_repo)
        self.user_id = user_id
        self.supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        self.progress_callback = progress_callback

    def _emit(self, step: str, message: str, data: dict = None):
        if self.progress_callback:
            self.progress_callback({
                "step": step,
                "message": message,
                "data": data or {}
            })
        print(f"[Agent] {step}: {message}")

    def _calculate_score(self, severity_counts: dict) -> int:
        total = sum(severity_counts.values())
        if total == 0:
            return 100
        penalty = (
            severity_counts.get("CRITICAL", 0) * 20 +
            severity_counts.get("HIGH", 0) * 10 +
            severity_counts.get("MEDIUM", 0) * 5 +
            severity_counts.get("LOW", 0) * 2
        )
        score = max(0, 100 - penalty)
        return score

    def run(self, scan_id: str) -> dict:
        results = {
            "scan_id": scan_id,
            "findings_processed": 0,
            "prs_opened": 0,
            "errors": []
        }

        try:
            # ── STEP 1: Test AWS Connection ──────────────
            self._emit("connecting", "Connecting to AWS...")
            if not self.scanner.test_connection():
                raise Exception("AWS connection failed. Check your credentials.")
            self._emit("connecting", "AWS connection successful")

            # ── STEP 2: Scan AWS Resources ───────────────
            self._emit("scanning", "Scanning AWS resources...")
            scan_results = self.scanner.run_full_scan()
            findings = scan_results["findings"]
            counts = scan_results["severity_counts"]
            self._emit("scanning", f"Found {len(findings)} misconfigurations", {"total": len(findings), "counts": counts})

            # Update scan record
            self.supabase.table("scans").update({
                "total_issues": scan_results["total"],
                "critical_count": counts["CRITICAL"],
                "high_count": counts["HIGH"],
                "medium_count": counts["MEDIUM"],
                "low_count": counts["LOW"],
            }).eq("id", scan_id).execute()

            # ── STEP 3-5: Process each finding ───────────
            for i, finding in enumerate(findings):
                try:
                    self._emit(
                        "analyzing",
                        f"Analyzing finding {i+1}/{len(findings)}: {finding['check_title']}",
                        {"current": i+1, "total": len(findings)}
                    )

                    # STEP 3: LLM Analysis
                    analysis = self.llm.analyze_finding(finding)

                    # STEP 4: Generate Terraform Patch
                    self._emit("patching", f"Generating Terraform fix for {finding['resource_id']}")
                    terraform_patch = self.llm.generate_terraform_patch(finding, analysis)

                    # STEP 5: Generate PR content
                    pr_content = self.llm.generate_pr_description(finding, analysis)
                    pr_title = pr_content.get("title", f"fix: {finding['check_title']}")
                    pr_body = pr_content.get("body", "")

                    # Save finding to DB
                    saved = self.supabase.table("findings").insert({
                        "scan_id": scan_id,
                        "user_id": self.user_id,
                        "resource_id": finding["resource_id"],
                        "resource_type": finding["resource_type"],
                        "check_id": finding["check_id"],
                        "check_title": finding["check_title"],
                        "severity": finding.get("severity", analysis.get("severity", "MEDIUM")),
                        "explanation": analysis.get("explanation"),
                        "risk_description": analysis.get("risk_description"),
                        "compliance_references": analysis.get("compliance_references"),
                        "terraform_patch": terraform_patch,
                        "pr_status": "pending"
                    }).execute()

                    finding_id = saved.data[0]["id"]

                    # STEP 6: Open GitHub PR
                    self._emit("pr_creation", f"Opening GitHub PR for {finding['resource_id']}")
                    pr_result = self.github.create_pr(
                        finding=finding,
                        terraform_patch=terraform_patch,
                        pr_title=pr_title,
                        pr_body=pr_body
                    )

                    # Update finding with PR info
                    self.supabase.table("findings").update({
                        "pr_url": pr_result["pr_url"],
                        "pr_number": pr_result["pr_number"],
                        "pr_status": "opened"
                    }).eq("id", finding_id).execute()

                    # Save PR record
                    self.supabase.table("pull_requests").insert({
                        "user_id": self.user_id,
                        "finding_id": finding_id,
                        "scan_id": scan_id,
                        "pr_number": pr_result["pr_number"],
                        "pr_url": pr_result["pr_url"],
                        "pr_title": pr_title,
                        "branch_name": pr_result["branch_name"],
                        "severity": finding.get("severity", "MEDIUM"),
                        "status": "open"
                    }).execute()

                    results["prs_opened"] += 1
                    results["findings_processed"] += 1
                    self._emit("pr_creation", f"PR opened: {pr_result['pr_url']}", pr_result)

                except Exception as e:
                    error_msg = f"Error processing finding {finding.get('check_id')}: {str(e)}"
                    print(error_msg)
                    results["errors"].append(error_msg)
                    results["findings_processed"] += 1

            # ── STEP 6: Calculate Security Score ─────────
            self._emit("scoring", "Calculating security score...")
            
            # Recalculate counts from actual processed findings
            actual_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for finding in findings:
                sev = finding.get("severity", "MEDIUM").upper()
                if sev in actual_counts:
                    actual_counts[sev] += 1
            
            score = self._calculate_score(actual_counts)

            self.supabase.table("security_scores").insert({
                "user_id": self.user_id,
                "score": score,
                "scan_id": scan_id
            }).execute()

            # Mark scan complete
            self.supabase.table("scans").update({
                "status": "completed"
            }).eq("id", scan_id).execute()

            self._emit("completed", f"Scan complete. Score: {score}/100. PRs opened: {results['prs_opened']}", {
                "security_score": score,
                "prs_opened": results["prs_opened"],
                "findings_by_severity": actual_counts
            })

            results["score"] = score
            results["severity_counts"] = counts
            return results

        except Exception as e:
            self.supabase.table("scans").update({
                "status": "failed",
                "error_message": str(e)
            }).eq("id", scan_id).execute()
            self._emit("error", str(e))
            raise