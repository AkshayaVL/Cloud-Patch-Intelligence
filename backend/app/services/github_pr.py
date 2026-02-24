from github import Github, GithubException
from datetime import datetime


class GitHubPRCreator:
    def __init__(self, token: str, repo_name: str):
        self.client = Github(token)
        self.repo = self.client.get_repo(repo_name)

    def test_connection(self) -> bool:
        try:
            _ = self.repo.full_name
            return True
        except GithubException:
            return False

    def _get_or_create_branch(self, branch_name: str) -> bool:
        try:
            # Get default branch SHA
            default_branch = self.repo.default_branch
            source = self.repo.get_branch(default_branch)
            # Create new branch
            self.repo.create_git_ref(
                ref=f"refs/heads/{branch_name}",
                sha=source.commit.sha
            )
            return True
        except GithubException as e:
            if "Reference already exists" in str(e):
                return True  # Branch already exists, that's fine
            print(f"Branch creation error: {e}")
            return False

    def _sanitize_branch_name(self, name: str) -> str:
        # Replace invalid characters for git branch names
        import re
        name = re.sub(r'[^a-zA-Z0-9_\-/]', '-', name)
        name = re.sub(r'-+', '-', name)
        return name[:60]  # Max branch name length

    def create_pr(
        self,
        finding: dict,
        terraform_patch: str,
        pr_title: str,
        pr_body: str
    ) -> dict:
        try:
            # Build branch name
            resource_id = finding.get("resource_id", "resource").replace(".", "-")
            check_id = finding.get("check_id", "check").lower()
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            raw_branch = f"cpi/fix-{resource_id}-{check_id}-{timestamp}"
            branch_name = self._sanitize_branch_name(raw_branch)

            # Create branch
            branch_created = self._get_or_create_branch(branch_name)
            if not branch_created:
                raise Exception(f"Failed to create branch {branch_name}")

            # Build file path
            resource_type = finding.get("resource_type", "resource").lower().replace(" ", "_")
            file_path = f"security-fixes/{resource_type}/{check_id}.tf"

            # Commit the Terraform patch
            try:
                # Check if file exists
                existing = self.repo.get_contents(file_path, ref=branch_name)
                self.repo.update_file(
                    path=file_path,
                    message=f"fix: {pr_title}",
                    content=terraform_patch,
                    sha=existing.sha,
                    branch=branch_name
                )
            except GithubException:
                # File doesn't exist, create it
                self.repo.create_file(
                    path=file_path,
                    message=f"fix: {pr_title}",
                    content=terraform_patch,
                    branch=branch_name
                )

            # Add severity label if it exists
            severity = finding.get("severity", "medium").lower()
            labels = []
            try:
                label = self.repo.get_label(severity)
                labels = [label.name]
            except GithubException:
                # Label doesn't exist, create it
                color_map = {
                    "critical": "d73a4a",
                    "high": "e4e669",
                    "medium": "0075ca",
                    "low": "cfd3d7"
                }
                try:
                    self.repo.create_label(
                        name=severity,
                        color=color_map.get(severity, "cfd3d7")
                    )
                    labels = [severity]
                except GithubException:
                    labels = []

            # Open Pull Request
            pr = self.repo.create_pull(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=self.repo.default_branch
            )

            # Apply label
            if labels:
                pr.add_to_labels(*labels)

            return {
                "pr_number": pr.number,
                "pr_url": pr.html_url,
                "branch_name": branch_name,
                "status": "opened"
            }

        except Exception as e:
            print(f"GitHub PR creation error: {e}")
            raise Exception(f"Failed to create PR: {str(e)}")