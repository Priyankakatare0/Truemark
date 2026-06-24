# backend/routes/auth.py

from fastapi import APIRouter, HTTPException, Request, Response, Depends

from core.logging import logger
from core.security import create_access_token, decode_access_token, hash_password, verify_password
from db import user_client
from models.user_schemas import LoginRequest, SignupRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Cookie name constant
_COOKIE_NAME = "tm_access_token"
_COOKIE_MAX_AGE = 30 * 60  # 30 minutes in seconds


def _set_auth_cookie(response: Response, token: str) -> None:
    """Attach the JWT as an HttpOnly cookie on the response."""
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production (HTTPS)
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Delete the JWT cookie."""
    response.delete_cookie(key=_COOKIE_NAME, path="/", samesite="lax")


def get_current_user(request: Request) -> dict | None:
    """
    Dependency: Extract and validate the JWT from the cookie.
    Returns the token payload dict or None if not authenticated.
    """
    token = request.cookies.get(_COOKIE_NAME)
    if not token:
        return None
    payload = decode_access_token(token)
    return payload  # None if expired/invalid


def require_user(request: Request) -> dict:
    """
    Dependency: Like get_current_user but raises 401 if not authenticated.
    Use this on protected endpoints.
    """
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )
    return user


@router.post("/signup", response_model=UserOut, status_code=201)
async def signup(body: SignupRequest, response: Response):
    """
    Register a new user account.
    Returns the user profile and sets a JWT cookie (30-min session).
    """
    # Check for duplicate email
    existing = user_client.get_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    # Hash password and create user
    try:
        password_hash = hash_password(body.password)
        user = user_client.create_user(
            name=body.name.strip(),
            email=body.email.lower(),
            password_hash=password_hash,
        )
    except Exception as e:
        logger.error("Signup failed for %s: %s", body.email, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create account. Please try again.")

    # Issue JWT cookie
    token = create_access_token(
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
    )
    _set_auth_cookie(response, token)

    logger.info("New user registered: %s (%s)", user["name"], user["id"])
    return UserOut(**user)


@router.post("/login", response_model=UserOut, status_code=200)
async def login(body: LoginRequest, response: Response):
    """
    Authenticate an existing user.
    Returns the user profile and sets a JWT cookie (30-min session).
    """
    user = user_client.get_user_by_email(body.email.lower())
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Issue JWT cookie
    token = create_access_token(
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
    )
    _set_auth_cookie(response, token)

    logger.info("User logged in: %s (%s)", user["name"], user["id"])
    return UserOut(**user)


@router.post("/logout", status_code=200)
async def logout(response: Response):
    """Clear the JWT cookie, ending the session."""
    _clear_auth_cookie(response)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserOut, status_code=200)
async def get_me(request: Request):
    """
    Return the currently authenticated user's profile.
    Used by the frontend on load to hydrate auth state from the cookie.
    """
    payload = get_current_user(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    user = user_client.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return UserOut(**user)
