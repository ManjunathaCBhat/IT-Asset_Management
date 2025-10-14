from fastapi import APIRouter, HTTPException, Request, Header
from ..models import UserCreate, UserUpdate, UserResponse
from backend.app.routes.auth import verify_jwt_token
from typing import List, Optional
from bson import ObjectId
import bcrypt

router = APIRouter()

def verify_auth(x_auth_token: Optional[str] = Header(None)):
    """Dependency to verify authentication"""
    if not x_auth_token:
        raise HTTPException(status_code=401, detail="No token, authorization denied")
    return verify_jwt_token(x_auth_token)

def check_admin(user: dict):
    """Check if user is admin"""
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Access denied. Admin role required.")

@router.get("", response_model=List[dict])
async def get_all_users(request: Request, auth_token: Optional[str] = Header(None, alias="x-auth-token")):
    """Get all users (Admin only)"""
    user = verify_auth(auth_token)
    check_admin(user)
    
    db = request.app.mongodb
    users_collection = db["users"]
    
    cursor = users_collection.find({})
    users_list = []
    
    async for user_doc in cursor:
        user_doc["_id"] = str(user_doc["_id"])
        # Remove password from response
        user_doc.pop("password", None)
        users_list.append(user_doc)
    
    return users_list

@router.post("/create")
async def create_user(
    new_user: UserCreate,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Create new user (Admin only)"""
    user = verify_auth(auth_token)
    check_admin(user)
    
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": new_user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Hash password
    hashed_password = bcrypt.hashpw(new_user.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user document
    user_data = new_user.dict()
    user_data["password"] = hashed_password.decode('utf-8')
    
    result = await users_collection.insert_one(user_data)
    
    return {"msg": "User created successfully"}

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Update user (Admin only)"""
    user = verify_auth(auth_token)
    check_admin(user)
    
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Validate ObjectId
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Check if user exists
    existing_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = user_update.dict(exclude_unset=True)
    
    # Hash password if provided
    if "password" in update_data and update_data["password"]:
        hashed_password = bcrypt.hashpw(update_data["password"].encode('utf-8'), bcrypt.gensalt())
        update_data["password"] = hashed_password.decode('utf-8')
    else:
        update_data.pop("password", None)
    
    # Check for email uniqueness if email is being updated
    if "email" in update_data:
        email_exists = await users_collection.find_one({
            "email": update_data["email"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        # Check if user exists but nothing was modified
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Get updated user
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password", None)
    
    return {"msg": "User updated successfully", "user": updated_user}

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Delete user (Admin only)"""
    user = verify_auth(auth_token)
    check_admin(user)
    
    db = request.app.mongodb
    users_collection = db["users"]
    
    # Prevent self-deletion
    if user_id == user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Validate ObjectId
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"msg": "User deleted"}