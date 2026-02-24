# Cloud Patch Intelligence (CPI)

> Autonomous AI agent that detects AWS cloud misconfigurations, generates Terraform patches using an LLM, and automatically opens GitHub Pull Requests — fully without human intervention.

---

## What It Does

1. **Connects** to your AWS account using read-only IAM credentials
2. **Scans** all AWS resources (S3, IAM, EC2, RDS, VPC, CloudTrail) for misconfigurations
3. **Analyzes** each issue using Google Gemini LLM
4. **Generates** a production-ready Terraform patch for every misconfiguration
5. **Opens** a labeled GitHub Pull Request with the fix and a security explanation
6. **Tracks** all scans, PRs, and your security score on a dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.11) |
| AI/LLM | Google Gemini 1.5 Flash |
| AWS Scanning | Boto3 + Checkov |
| GitHub Integration | PyGithub |
| Database & Auth | Supabase (PostgreSQL) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

---

## Project Structure
```
cloud-patch-intelligence/
├── frontend/        # Next.js application
├── backend/         # FastAPI application
├── docs/            # Architecture and documentation
├── .env.example     # Environment variable template
└── README.md
```

## Getting Started

See setup instructions in `docs/architecture.md`.

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values before running locally.

---

*Built with FastAPI, Next.js, Checkov, and Google Gemini*