# Architecture Overview

## System Design
```
Browser → Next.js (Vercel) → FastAPI (Railway) → Supabase
                                    ↓
                          Agent Orchestrator
                         /        |         \
                   Boto3      Gemini LLM    PyGithub
                 (AWS scan)  (analyze+fix) (open PR)
```

## Agent Pipeline

1. User clicks "Run Scan"
2. Boto3 fetches live AWS resource configs
3. Checkov runs static analysis → list of misconfigurations
4. Gemini analyzes each issue (plain English + severity)
5. Gemini generates Terraform patch for each issue
6. PyGithub creates branch + commits fix + opens PR
7. Results saved to Supabase, security score updated

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- A Supabase account (free)
- A Google AI Studio account for Gemini API key (free)

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` in both `/backend` and `/frontend`
3. Fill in your API keys
4. Follow backend and frontend setup in their respective folders