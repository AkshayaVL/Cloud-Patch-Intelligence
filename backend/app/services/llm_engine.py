import google.generativeai as genai
import json
import re
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)


class LLMEngine:
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def _clean_json(self, text: str) -> str:
        # Remove markdown code blocks if present
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        return text.strip()

    # ─── Analyze a misconfiguration ─────────────────────
    def analyze_finding(self, finding: dict) -> dict:
        prompt = f"""
You are a senior cloud security engineer. Analyze this AWS misconfiguration and return a JSON response.

Misconfiguration:
- Resource: {finding.get('resource_id')}
- Resource Type: {finding.get('resource_type')}
- Check ID: {finding.get('check_id')}
- Issue: {finding.get('check_title')}
- Severity: {finding.get('severity')}

Return ONLY a valid JSON object with these exact fields:
{{
    "explanation": "Plain English explanation of what this misconfiguration is (2-3 sentences)",
    "risk_description": "What attack vectors this enables and what data/systems are at risk (2-3 sentences)",
    "compliance_references": "Relevant compliance standards (e.g. CIS AWS 2.1.1, NIST AC-3, SOC2 CC6.1)",
    "severity": "CRITICAL or HIGH or MEDIUM or LOW"
}}

Return only the JSON, no other text.
"""
        try:
            response = self.model.generate_content(prompt)
            cleaned = self._clean_json(response.text)
            return json.loads(cleaned)
        except Exception as e:
            print(f"LLM analyze error: {e}")
            return {
                "explanation": finding.get("check_title", "No explanation available"),
                "risk_description": "Unable to generate risk description",
                "compliance_references": "N/A",
                "severity": finding.get("severity", "MEDIUM")
            }

    # ─── Generate Terraform patch ────────────────────────
    def generate_terraform_patch(self, finding: dict, analysis: dict) -> str:
        prompt = f"""
You are a senior DevSecOps engineer. Generate a production-ready Terraform fix for this AWS misconfiguration.

Misconfiguration:
- Resource: {finding.get('resource_id')}
- Resource Type: {finding.get('resource_type')}
- Issue: {finding.get('check_title')}
- Explanation: {analysis.get('explanation')}
- Severity: {finding.get('severity')}

Requirements:
1. Write a complete, valid Terraform resource block that fixes this misconfiguration
2. Add inline comments explaining each security-relevant change
3. Follow AWS and Terraform best practices
4. Return ONLY the Terraform code, no markdown, no explanation outside the code

Example format:
# Fix for {finding.get('check_id')} - {finding.get('check_title')}
resource "aws_..." "..." {{
  # ... terraform code with inline comments
}}
"""
        try:
            response = self.model.generate_content(prompt)
            cleaned = self._clean_json(response.text)
            return cleaned
        except Exception as e:
            print(f"LLM patch error: {e}")
            return f"# Terraform patch generation failed for {finding.get('resource_id')}\n# Error: {str(e)}"

    # ─── Generate PR description ─────────────────────────
    def generate_pr_description(self, finding: dict, analysis: dict) -> dict:
        prompt = f"""
You are a senior security engineer writing a GitHub Pull Request description for a cloud security fix.

Misconfiguration Fixed:
- Resource: {finding.get('resource_id')}
- Issue: {finding.get('check_title')}
- Severity: {finding.get('severity')}
- Explanation: {analysis.get('explanation')}
- Risk: {analysis.get('risk_description')}
- Compliance: {analysis.get('compliance_references')}

Return ONLY a valid JSON object with these fields:
{{
    "title": "Short PR title (under 72 characters)",
    "body": "Full PR description in markdown with sections: ## Summary, ## Security Impact, ## Changes Made, ## Compliance"
}}

Return only the JSON, no other text.
"""
        try:
            response = self.model.generate_content(prompt)
            cleaned = self._clean_json(response.text)
            return json.loads(cleaned)
        except Exception as e:
            print(f"LLM PR description error: {e}")
            return {
                "title": f"fix: {finding.get('check_title', 'Security fix')}",
                "body": f"## Summary\nFixes {finding.get('check_id')} - {finding.get('check_title')}\n\n## Severity\n{finding.get('severity')}"
            }

    # ─── Process one finding end to end ─────────────────
    def process_finding(self, finding: dict) -> dict:
        analysis = self.analyze_finding(finding)
        terraform_patch = self.generate_terraform_patch(finding, analysis)
        pr_content = self.generate_pr_description(finding, analysis)

        return {
            "analysis": analysis,
            "terraform_patch": terraform_patch,
            "pr_title": pr_content.get("title"),
            "pr_body": pr_content.get("body")
        }