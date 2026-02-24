from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, scan, results, prs, score
from app.routers import websocket

app = FastAPI(
    title="Cloud Patch Intelligence API",
    description="Autonomous AI agent for cloud misconfiguration detection and remediation",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(results.router)
app.include_router(prs.router)
app.include_router(score.router)
app.include_router(websocket.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Cloud Patch Intelligence API"}