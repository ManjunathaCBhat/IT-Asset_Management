from fastapi import APIRouter, HTTPException, Request
from ..models import UserLogin, Token, ForgotPassword, ResetPassword
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
import secrets

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 2

# In-memory token storage (use Redis in production)
reset_tokens = {}

def create_jwt_token(user_data: dict) -> str:
    """Create JWT token"""
    payload = {
        "user": user_data,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/users/login", response_model=Token)
async def login(user: UserLogin, request: Request):
    """User login endpoint"""
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Find user by email
    existing_user = await users_collection.find_one({"email": user.email})
    
    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Verify password
    try:
        if not bcrypt.checkpw(user.password.encode('utf-8'), existing_user["password"].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Invalid credentials")
    except Exception as e:
        print(f"Password verification error: {e}")
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Create token payload
    user_data = {
        "id": str(existing_user["_id"]),
        "email": existing_user["email"],
        "role": existing_user["role"]
    }
    
    token = create_jwt_token(user_data)
    
    return Token(token=token, user=user_data)

@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, request: Request):
    """Send password reset email"""
    from backend.app.routes.email import send_reset_email
    
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Find user
    user = await users_collection.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="No account found with that email address."
        )
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=1)
    
    # Store token
    reset_tokens[reset_token] = {
        "email": data.email,
        "expiry": expiry
    }
    
    # Send email
    try:
        await send_reset_email(data.email, reset_token)
        return {
            "success": True, 
            "message": "Password reset link sent to your email successfully."
        }
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to send reset email. Please try again later."
        )

@router.post("/reset-password")
async def reset_password(data: ResetPassword, request: Request):
    """Reset user password"""
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Verify token exists
    if data.token not in reset_tokens:
        raise HTTPException(
            status_code=400, 
            detail="Invalid or expired reset token"
        )
    
    token_data = reset_tokens[data.token]
    
    # Check expiry
    if token_data["expiry"] < datetime.now():
        del reset_tokens[data.token]
        raise HTTPException(
            status_code=400, 
            detail="Reset token has expired"
        )
    
    # Check email match
    if token_data["email"] != data.email:
        raise HTTPException(
            status_code=400, 
            detail="Invalid token for this email address"
        )
    
    # Find user
    user = await users_collection.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    hashed_password = bcrypt.hashpw(data.newPassword.encode('utf-8'), bcrypt.gensalt())
    
    # Update password
    await users_collection.update_one(
        {"email": data.email},
        {
            "$set": {
                "password": hashed_password.decode('utf-8'),
                "resetPasswordToken": None,
                "resetPasswordExpires": None
            }
        }
    )
    
    # Remove used token
    del reset_tokens[data.token]
    
    return {
        "success": True, 
        "message": "Password reset successfully!"
    }