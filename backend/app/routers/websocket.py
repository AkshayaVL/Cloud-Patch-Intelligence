from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.agent import AgentOrchestrator
from app.utils.security import decode_access_token
from app.config import settings
from supabase import create_client
import json

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/scan")
async def websocket_scan(websocket: WebSocket):
    await websocket.accept()

    async def send_progress(event: dict):
        try:
            await websocket.send_text(json.dumps(event))
        except Exception:
            pass

    try:
        # Step 1 — Receive credentials from client
        raw = await websocket.receive_text()
        data = json.loads(raw)

        # Step 2 — Validate token
        token = data.get("token")
        payload = decode_access_token(token)
        if not payload:
            await websocket.send_text(json.dumps({
                "step": "error",
                "message": "Invalid or expired token"
            }))
            await websocket.close()
            return

        user_id = payload.get("sub")
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

        # Step 3 — Create scan record
        scan = supabase.table("scans").insert({
            "user_id": user_id,
            "status": "running"
        }).execute()
        scan_id = scan.data[0]["id"]

        await send_progress({
            "step": "started",
            "message": "Scan started",
            "scan_id": scan_id
        })

        # Step 4 — Run agent with progress callbacks
        import asyncio
        loop = asyncio.get_event_loop()

        def sync_progress(event: dict):
            asyncio.run_coroutine_threadsafe(send_progress(event), loop)

        agent = AgentOrchestrator(
            aws_access_key_id=data.get("aws_access_key_id"),
            aws_secret_access_key=data.get("aws_secret_access_key"),
            aws_region=data.get("aws_region", "us-east-1"),
            github_token=data.get("github_token"),
            github_repo=data.get("github_repo"),
            user_id=user_id,
            progress_callback=sync_progress
        )

        # Run in thread pool to not block event loop
        results = await loop.run_in_executor(None, agent.run, scan_id)

        await send_progress({
            "step": "completed",
            "message": "Scan completed successfully",
            "data": results
        })

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "step": "error",
                "message": str(e)
            }))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass