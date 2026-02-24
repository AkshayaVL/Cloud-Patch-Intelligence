import boto3
import json
from typing import Any
from botocore.exceptions import ClientError, NoCredentialsError


class AWSScanner:
    def __init__(self, access_key_id: str, secret_access_key: str, region: str = "us-east-1"):
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.region = region
        self.session = boto3.Session(
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )

    def test_connection(self) -> bool:
        try:
            sts = self.session.client("sts")
            sts.get_caller_identity()
            return True
        except (ClientError, NoCredentialsError):
            return False

    # ─── S3 ─────────────────────────────────────────────
    def scan_s3_buckets(self) -> list[dict]:
        findings = []
        try:
            s3 = self.session.client("s3")
            buckets = s3.list_buckets().get("Buckets", [])

            for bucket in buckets:
                name = bucket["Name"]
                config = {"bucket_name": name, "issues": []}

                # Check public access block
                try:
                    pab = s3.get_public_access_block(Bucket=name)
                    block_config = pab["PublicAccessBlockConfiguration"]
                    if not all([
                        block_config.get("BlockPublicAcls"),
                        block_config.get("IgnorePublicAcls"),
                        block_config.get("BlockPublicPolicy"),
                        block_config.get("RestrictPublicBuckets")
                    ]):
                        config["issues"].append({
                            "check_id": "CKV_AWS_53",
                            "check_title": "S3 bucket public access not fully blocked",
                            "severity": "HIGH",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket"
                        })
                except ClientError:
                    config["issues"].append({
                        "check_id": "CKV_AWS_53",
                        "check_title": "S3 bucket has no public access block configuration",
                        "severity": "HIGH",
                        "resource_id": f"aws_s3_bucket.{name}",
                        "resource_type": "S3 Bucket"
                    })

                # Check encryption
                try:
                    s3.get_bucket_encryption(Bucket=name)
                except ClientError as e:
                    if "ServerSideEncryptionConfigurationNotFoundError" in str(e):
                        config["issues"].append({
                            "check_id": "CKV_AWS_19",
                            "check_title": "S3 bucket does not have server-side encryption enabled",
                            "severity": "MEDIUM",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket"
                        })

                # Check versioning
                try:
                    versioning = s3.get_bucket_versioning(Bucket=name)
                    if versioning.get("Status") != "Enabled":
                        config["issues"].append({
                            "check_id": "CKV_AWS_21",
                            "check_title": "S3 bucket versioning is not enabled",
                            "severity": "LOW",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket"
                        })
                except ClientError:
                    pass

                findings.extend(config["issues"])

        except Exception as e:
            print(f"S3 scan error: {e}")

        return findings

    # ─── IAM ────────────────────────────────────────────
    def scan_iam(self) -> list[dict]:
        findings = []
        try:
            iam = self.session.client("iam")
            policies = iam.list_policies(Scope="Local").get("Policies", [])

            for policy in policies:
                version = iam.get_policy_version(
                    PolicyArn=policy["Arn"],
                    VersionId=policy["DefaultVersionId"]
                )
                doc = version["PolicyVersion"]["Document"]
                statements = doc.get("Statement", [])

                for stmt in statements:
                    actions = stmt.get("Action", [])
                    resources = stmt.get("Resource", [])
                    effect = stmt.get("Effect", "")

                    if isinstance(actions, str):
                        actions = [actions]
                    if isinstance(resources, str):
                        resources = [resources]

                    if effect == "Allow" and "*" in actions and "*" in resources:
                        findings.append({
                            "check_id": "CKV_AWS_40",
                            "check_title": "IAM policy allows full admin privileges (*:*)",
                            "severity": "CRITICAL",
                            "resource_id": f"aws_iam_policy.{policy['PolicyName']}",
                            "resource_type": "IAM Policy"
                        })

        except Exception as e:
            print(f"IAM scan error: {e}")

        return findings

    # ─── EC2 Security Groups ─────────────────────────────
    def scan_security_groups(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            sgs = ec2.describe_security_groups().get("SecurityGroups", [])

            for sg in sgs:
                sg_id = sg["GroupId"]
                sg_name = sg.get("GroupName", sg_id)

                for rule in sg.get("IpPermissions", []):
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            from_port = rule.get("FromPort", 0)
                            findings.append({
                                "check_id": "CKV_AWS_25",
                                "check_title": f"Security group {sg_name} allows unrestricted inbound access on port {from_port}",
                                "severity": "HIGH",
                                "resource_id": f"aws_security_group.{sg_id}",
                                "resource_type": "EC2 Security Group"
                            })

        except Exception as e:
            print(f"Security group scan error: {e}")

        return findings

    # ─── RDS ────────────────────────────────────────────
    def scan_rds(self) -> list[dict]:
        findings = []
        try:
            rds = self.session.client("rds")
            instances = rds.describe_db_instances().get("DBInstances", [])

            for db in instances:
                db_id = db["DBInstanceIdentifier"]

                if not db.get("StorageEncrypted", False):
                    findings.append({
                        "check_id": "CKV_AWS_17",
                        "check_title": f"RDS instance {db_id} is not encrypted at rest",
                        "severity": "HIGH",
                        "resource_id": f"aws_db_instance.{db_id}",
                        "resource_type": "RDS Instance"
                    })

                if db.get("PubliclyAccessible", False):
                    findings.append({
                        "check_id": "CKV_AWS_17b",
                        "check_title": f"RDS instance {db_id} is publicly accessible",
                        "severity": "CRITICAL",
                        "resource_id": f"aws_db_instance.{db_id}",
                        "resource_type": "RDS Instance"
                    })

        except Exception as e:
            print(f"RDS scan error: {e}")

        return findings

    # ─── CloudTrail ──────────────────────────────────────
    def scan_cloudtrail(self) -> list[dict]:
        findings = []
        try:
            ct = self.session.client("cloudtrail")
            trails = ct.describe_trails().get("trailList", [])

            if not trails:
                findings.append({
                    "check_id": "CKV_AWS_67",
                    "check_title": "CloudTrail is not enabled in this account",
                    "severity": "HIGH",
                    "resource_id": "aws_cloudtrail.default",
                    "resource_type": "CloudTrail"
                })
            else:
                for trail in trails:
                    if not trail.get("IsMultiRegionTrail", False):
                        findings.append({
                            "check_id": "CKV_AWS_67",
                            "check_title": f"CloudTrail {trail['Name']} is not multi-region",
                            "severity": "MEDIUM",
                            "resource_id": f"aws_cloudtrail.{trail['Name']}",
                            "resource_type": "CloudTrail"
                        })

        except Exception as e:
            print(f"CloudTrail scan error: {e}")

        return findings

    # ─── Run Full Scan ───────────────────────────────────
    def run_full_scan(self) -> dict:
        print("Starting AWS scan...")
        all_findings = []

        all_findings.extend(self.scan_s3_buckets())
        all_findings.extend(self.scan_iam())
        all_findings.extend(self.scan_security_groups())
        all_findings.extend(self.scan_rds())
        all_findings.extend(self.scan_cloudtrail())

        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in all_findings:
            sev = f.get("severity", "LOW")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return {
            "findings": all_findings,
            "total": len(all_findings),
            "severity_counts": severity_counts
        }