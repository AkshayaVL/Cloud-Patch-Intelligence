import boto3
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
                        findings.append({
                            "check_id": "CKV_AWS_53",
                            "check_title": "S3 bucket public access not fully blocked",
                            "severity": "HIGH",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket",
                            "category": "S3"
                        })
                except ClientError:
                    findings.append({
                        "check_id": "CKV_AWS_53",
                        "check_title": "S3 bucket has no public access block configuration",
                        "severity": "HIGH",
                        "resource_id": f"aws_s3_bucket.{name}",
                        "resource_type": "S3 Bucket",
                        "category": "S3"
                    })

                # Check encryption
                try:
                    s3.get_bucket_encryption(Bucket=name)
                except ClientError as e:
                    if "ServerSideEncryptionConfigurationNotFoundError" in str(e):
                        findings.append({
                            "check_id": "CKV_AWS_19",
                            "check_title": "S3 bucket does not have server-side encryption enabled",
                            "severity": "MEDIUM",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket",
                            "category": "S3"
                        })

                # Check versioning
                try:
                    versioning = s3.get_bucket_versioning(Bucket=name)
                    if versioning.get("Status") != "Enabled":
                        findings.append({
                            "check_id": "CKV_AWS_21",
                            "check_title": "S3 bucket versioning is not enabled",
                            "severity": "LOW",
                            "resource_id": f"aws_s3_bucket.{name}",
                            "resource_type": "S3 Bucket",
                            "category": "S3"
                        })
                except ClientError:
                    pass

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
                            "resource_type": "IAM Policy",
                            "category": "IAM"
                        })

        except Exception as e:
            print(f"IAM scan error: {e}")

        return findings

    # ─── Security Groups ─────────────────────────────────
    def scan_security_groups(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            sgs = ec2.describe_security_groups().get("SecurityGroups", [])

            CRITICAL_PORTS = {
                22: "SSH",
                3389: "RDP",
                3306: "MySQL",
                5432: "PostgreSQL",
                27017: "MongoDB",
                6379: "Redis",
                9200: "Elasticsearch",
            }

            for sg in sgs:
                sg_id = sg["GroupId"]
                sg_name = sg.get("GroupName", sg_id)

                for rule in sg.get("IpPermissions", []):
                    from_port = rule.get("FromPort", 0)
                    to_port = rule.get("ToPort", 65535)
                    protocol = rule.get("IpProtocol", "-1")

                    for ip_range in rule.get("IpRanges", []):
                        cidr = ip_range.get("CidrIp", "")
                        if cidr == "0.0.0.0/0":
                            # All traffic open
                            if protocol == "-1":
                                findings.append({
                                    "check_id": "CKV_AWS_25",
                                    "check_title": f"Security group {sg_name} allows ALL inbound traffic from internet (0.0.0.0/0)",
                                    "severity": "CRITICAL",
                                    "resource_id": f"aws_security_group.{sg_id}",
                                    "resource_type": "EC2 Security Group",
                                    "category": "Security Groups"
                                })
                            else:
                                # Check critical ports
                                for port, service in CRITICAL_PORTS.items():
                                    if from_port <= port <= to_port:
                                        findings.append({
                                            "check_id": f"CKV_AWS_25_{service}",
                                            "check_title": f"Security group {sg_name} exposes {service} (port {port}) to the internet",
                                            "severity": "CRITICAL" if port in [22, 3389] else "HIGH",
                                            "resource_id": f"aws_security_group.{sg_id}",
                                            "resource_type": "EC2 Security Group",
                                            "category": "Security Groups"
                                        })

                                # Any other open port
                                if not any(from_port <= p <= to_port for p in CRITICAL_PORTS):
                                    findings.append({
                                        "check_id": "CKV_AWS_25",
                                        "check_title": f"Security group {sg_name} allows unrestricted inbound on port {from_port}",
                                        "severity": "HIGH",
                                        "resource_id": f"aws_security_group.{sg_id}",
                                        "resource_type": "EC2 Security Group",
                                        "category": "Security Groups"
                                    })

                    # IPv6 check
                    for ipv6_range in rule.get("Ipv6Ranges", []):
                        if ipv6_range.get("CidrIpv6") == "::/0":
                            findings.append({
                                "check_id": "CKV_AWS_25_IPV6",
                                "check_title": f"Security group {sg_name} allows unrestricted IPv6 inbound access",
                                "severity": "HIGH",
                                "resource_id": f"aws_security_group.{sg_id}",
                                "resource_type": "EC2 Security Group",
                                "category": "Security Groups"
                            })

        except Exception as e:
            print(f"Security group scan error: {e}")

        return findings

    # ─── Subnets ─────────────────────────────────────────
    def scan_subnets(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            subnets = ec2.describe_subnets().get("Subnets", [])

            for subnet in subnets:
                subnet_id = subnet["SubnetId"]
                name = next(
                    (t["Value"] for t in subnet.get("Tags", []) if t["Key"] == "Name"),
                    subnet_id
                )

                # Public subnet auto-assigns public IPs
                if subnet.get("MapPublicIpOnLaunch", False):
                    findings.append({
                        "check_id": "CKV_AWS_130",
                        "check_title": f"Subnet {name} auto-assigns public IP to instances on launch",
                        "severity": "MEDIUM",
                        "resource_id": f"aws_subnet.{subnet_id}",
                        "resource_type": "VPC Subnet",
                        "category": "Subnets"
                    })

                # Subnet has no name tag (poor hygiene)
                has_name = any(t["Key"] == "Name" for t in subnet.get("Tags", []))
                if not has_name:
                    findings.append({
                        "check_id": "CKV_AWS_SUB_TAG",
                        "check_title": f"Subnet {subnet_id} has no Name tag — hard to identify public vs private",
                        "severity": "LOW",
                        "resource_id": f"aws_subnet.{subnet_id}",
                        "resource_type": "VPC Subnet",
                        "category": "Subnets"
                    })

        except Exception as e:
            print(f"Subnet scan error: {e}")

        return findings

    # ─── Route Tables ─────────────────────────────────────
    def scan_route_tables(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            route_tables = ec2.describe_route_tables().get("RouteTables", [])

            for rt in route_tables:
                rt_id = rt["RouteTableId"]
                name = next(
                    (t["Value"] for t in rt.get("Tags", []) if t["Key"] == "Name"),
                    rt_id
                )

                for route in rt.get("Routes", []):
                    dest = route.get("DestinationCidrBlock", "")
                    gateway = route.get("GatewayId", "")
                    state = route.get("State", "")

                    # Route to internet gateway with 0.0.0.0/0
                    if dest == "0.0.0.0/0" and gateway.startswith("igw-") and state == "active":
                        # Check how many subnets this affects
                        assoc_count = len(rt.get("Associations", []))
                        findings.append({
                            "check_id": "CKV_AWS_RT_IGW",
                            "check_title": f"Route table {name} has a default route to Internet Gateway — {assoc_count} subnet(s) exposed to internet",
                            "severity": "HIGH",
                            "resource_id": f"aws_route_table.{rt_id}",
                            "resource_type": "VPC Route Table",
                            "category": "Route Tables"
                        })

                    # Blackhole routes (dead routes — misconfiguration)
                    if state == "blackhole":
                        findings.append({
                            "check_id": "CKV_AWS_RT_BH",
                            "check_title": f"Route table {name} has a blackhole route for {dest} — indicates broken infrastructure",
                            "severity": "MEDIUM",
                            "resource_id": f"aws_route_table.{rt_id}",
                            "resource_type": "VPC Route Table",
                            "category": "Route Tables"
                        })

        except Exception as e:
            print(f"Route table scan error: {e}")

        return findings

    # ─── VPC ──────────────────────────────────────────────
    def scan_vpc(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            vpcs = ec2.describe_vpcs().get("Vpcs", [])

            for vpc in vpcs:
                vpc_id = vpc["VpcId"]
                name = next(
                    (t["Value"] for t in vpc.get("Tags", []) if t["Key"] == "Name"),
                    vpc_id
                )
                is_default = vpc.get("IsDefault", False)

                # Default VPC should not be used in production
                if is_default:
                    findings.append({
                        "check_id": "CKV_AWS_148",
                        "check_title": f"Default VPC {vpc_id} exists — workloads should use custom VPCs with proper segmentation",
                        "severity": "MEDIUM",
                        "resource_id": f"aws_vpc.{vpc_id}",
                        "resource_type": "VPC",
                        "category": "VPC Design"
                    })

                # Check flow logs enabled
                flow_logs = ec2.describe_flow_logs(
                    Filters=[{"Name": "resource-id", "Values": [vpc_id]}]
                ).get("FlowLogs", [])

                if not flow_logs:
                    findings.append({
                        "check_id": "CKV_AWS_73",
                        "check_title": f"VPC {name} does not have flow logs enabled — network traffic is not being monitored",
                        "severity": "MEDIUM",
                        "resource_id": f"aws_vpc.{vpc_id}",
                        "resource_type": "VPC",
                        "category": "VPC Design"
                    })

                # Check DNS hostnames enabled (needed for proper private DNS)
                dns = ec2.describe_vpc_attribute(VpcId=vpc_id, Attribute="enableDnsHostnames")
                if not dns["EnableDnsHostnames"]["Value"]:
                    findings.append({
                        "check_id": "CKV_AWS_VPC_DNS",
                        "check_title": f"VPC {name} does not have DNS hostnames enabled",
                        "severity": "LOW",
                        "resource_id": f"aws_vpc.{vpc_id}",
                        "resource_type": "VPC",
                        "category": "VPC Design"
                    })

        except Exception as e:
            print(f"VPC scan error: {e}")

        return findings

    # ─── EC2 Placement ────────────────────────────────────
    def scan_ec2_instances(self) -> list[dict]:
        findings = []
        try:
            ec2 = self.session.client("ec2")
            reservations = ec2.describe_instances(
                Filters=[{"Name": "instance-state-name", "Values": ["running", "stopped"]}]
            ).get("Reservations", [])

            for reservation in reservations:
                for instance in reservation.get("Instances", []):
                    instance_id = instance["InstanceId"]
                    name = next(
                        (t["Value"] for t in instance.get("Tags", []) if t["Key"] == "Name"),
                        instance_id
                    )

                    # Public IP assigned
                    if instance.get("PublicIpAddress"):
                        findings.append({
                            "check_id": "CKV_AWS_EC2_PIP",
                            "check_title": f"EC2 instance {name} has a public IP address ({instance['PublicIpAddress']}) — directly exposed to internet",
                            "severity": "HIGH",
                            "resource_id": f"aws_instance.{instance_id}",
                            "resource_type": "EC2 Instance",
                            "category": "EC2 Placement"
                        })

                    # No IMDSv2 (metadata service hardening)
                    metadata_options = instance.get("MetadataOptions", {})
                    if metadata_options.get("HttpTokens") != "required":
                        findings.append({
                            "check_id": "CKV_AWS_79",
                            "check_title": f"EC2 instance {name} does not enforce IMDSv2 — vulnerable to SSRF metadata attacks",
                            "severity": "HIGH",
                            "resource_id": f"aws_instance.{instance_id}",
                            "resource_type": "EC2 Instance",
                            "category": "EC2 Placement"
                        })

                    # EBS root volume not encrypted
                    for bdm in instance.get("BlockDeviceMappings", []):
                        vol_id = bdm.get("Ebs", {}).get("VolumeId")
                        if vol_id:
                            try:
                                vol = ec2.describe_volumes(VolumeIds=[vol_id])["Volumes"][0]
                                if not vol.get("Encrypted", False):
                                    findings.append({
                                        "check_id": "CKV_AWS_8",
                                        "check_title": f"EC2 instance {name} has unencrypted EBS volume ({vol_id})",
                                        "severity": "MEDIUM",
                                        "resource_id": f"aws_instance.{instance_id}",
                                        "resource_type": "EC2 Instance",
                                        "category": "EC2 Placement"
                                    })
                            except ClientError:
                                pass

                    # Instance in public subnet check
                    subnet_id = instance.get("SubnetId", "")
                    if subnet_id:
                        try:
                            subnet = ec2.describe_subnets(SubnetIds=[subnet_id])["Subnets"][0]
                            if subnet.get("MapPublicIpOnLaunch", False):
                                findings.append({
                                    "check_id": "CKV_AWS_EC2_PUBLIC_SUBNET",
                                    "check_title": f"EC2 instance {name} is placed in a public subnet ({subnet_id})",
                                    "severity": "MEDIUM",
                                    "resource_id": f"aws_instance.{instance_id}",
                                    "resource_type": "EC2 Instance",
                                    "category": "EC2 Placement"
                                })
                        except ClientError:
                            pass

        except Exception as e:
            print(f"EC2 scan error: {e}")

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
                        "resource_type": "RDS Instance",
                        "category": "RDS"
                    })

                if db.get("PubliclyAccessible", False):
                    findings.append({
                        "check_id": "CKV_AWS_17b",
                        "check_title": f"RDS instance {db_id} is publicly accessible",
                        "severity": "CRITICAL",
                        "resource_id": f"aws_db_instance.{db_id}",
                        "resource_type": "RDS Instance",
                        "category": "RDS"
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
                    "resource_type": "CloudTrail",
                    "category": "CloudTrail"
                })
            else:
                for trail in trails:
                    if not trail.get("IsMultiRegionTrail", False):
                        findings.append({
                            "check_id": "CKV_AWS_67",
                            "check_title": f"CloudTrail {trail['Name']} is not multi-region",
                            "severity": "MEDIUM",
                            "resource_id": f"aws_cloudtrail.{trail['Name']}",
                            "resource_type": "CloudTrail",
                            "category": "CloudTrail"
                        })

        except Exception as e:
            print(f"CloudTrail scan error: {e}")

        return findings

    # ─── Run Full Scan ───────────────────────────────────
    def run_full_scan(self) -> dict:
        print("Starting full AWS scan...")
        all_findings = []

        scanners = [
            ("S3", self.scan_s3_buckets),
            ("IAM", self.scan_iam),
            ("Security Groups", self.scan_security_groups),
            ("Subnets", self.scan_subnets),
            ("Route Tables", self.scan_route_tables),
            ("VPC", self.scan_vpc),
            ("EC2", self.scan_ec2_instances),
            ("RDS", self.scan_rds),
            ("CloudTrail", self.scan_cloudtrail),
        ]

        for name, scanner in scanners:
            try:
                print(f"Scanning {name}...")
                results = scanner()
                all_findings.extend(results)
                print(f"  → {len(results)} findings")
            except Exception as e:
                print(f"  → {name} scan failed: {e}")

        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in all_findings:
            sev = f.get("severity", "LOW").upper()
            if sev in severity_counts:
                severity_counts[sev] += 1

        return {
            "findings": all_findings,
            "total": len(all_findings),
            "severity_counts": severity_counts
        }