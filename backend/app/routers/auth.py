from fastapi import APIRouter, HTTPException, status, Depends
from app.models import RegisterRequest, LoginRequest, TokenResponse
from app.config import settings
from app.dependencies import get_current_user
from supabase import create_client

router = APIRouter(prefix="/auth", tags=["auth"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password
        })
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )

        # If email confirmation is required, session will be None
        if response.session is None:
            return TokenResponse(
                access_token="email_confirmation_required",
                user_id=str(response.user.id),
                email=response.user.email
            )

        return TokenResponse(
            access_token=response.session.access_token,
            user_id=str(response.user.id),
            email=response.user.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        return TokenResponse(
            access_token=response.session.access_token,
            user_id=str(response.user.id),
            email=response.user.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user.get("sub"),
        "email": current_user.get("email")
    }