from fastapi import APIRouter, HTTPException, Request, Header
from backend.app.models import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from backend.app.routes.auth import verify_jwt_token
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import re

router = APIRouter()

def verify_auth(x_auth_token: Optional[str] = Header(None)):
    """Dependency to verify authentication"""
    if not x_auth_token:
        raise HTTPException(status_code=401, detail="No token, authorization denied")
    return verify_jwt_token(x_auth_token)

def check_role(user: dict, allowed_roles: List[str]):
    """Check if user has required role"""
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied. Insufficient role.")

@router.get("", response_model=List[dict])
async def get_all_equipment(request: Request, auth_token: Optional[str] = Header(None, alias="x-auth-token")):
    """Get all equipment (not deleted)"""
    user = None
    if auth_token:
        user = verify_auth(auth_token)
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    cursor = equipment_collection.find({"isDeleted": {"$ne": True}})
    equipment_list = []
    
    async for equipment in cursor:
        equipment["_id"] = str(equipment["_id"])
        equipment_list.append(equipment)
    
    return equipment_list

@router.get("/summary")
async def get_equipment_summary(request: Request, auth_token: Optional[str] = Header(None, alias="x-auth-token")):
    """Get equipment summary statistics"""
    user = None
    if auth_token:
        user = verify_auth(auth_token)
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    total_assets = await equipment_collection.count_documents({"isDeleted": {"$ne": True}})
    in_use = await equipment_collection.count_documents({"status": "In Use", "isDeleted": {"$ne": True}})
    in_stock = await equipment_collection.count_documents({"status": "In Stock", "isDeleted": {"$ne": True}})
    damaged = await equipment_collection.count_documents({"status": "Damaged", "isDeleted": {"$ne": True}})
    e_waste = await equipment_collection.count_documents({"status": "E-Waste", "isDeleted": {"$ne": True}})
    removed = await equipment_collection.count_documents({"status": "Removed"})
    
    return {
        "totalAssets": total_assets,
        "inUse": in_use,
        "inStock": in_stock,
        "damaged": damaged,
        "eWaste": e_waste,
        "removed": removed
    }

@router.get("/count/{category}")
async def get_category_count(category: str, request: Request, auth_token: Optional[str] = Header(None, alias="x-auth-token")):
    """Get count of equipment by category"""
    user = None
    if auth_token:
        user = verify_auth(auth_token)
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    count = await equipment_collection.count_documents({
        "category": category,
        "isDeleted": {"$ne": True}
    })
    
    return {"count": count}

@router.get("/removed")
async def get_removed_equipment(request: Request, auth_token: Optional[str] = Header(None, alias="x-auth-token")):
    """Get all removed equipment"""
    user = None
    if auth_token:
        user = verify_auth(auth_token)
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    cursor = equipment_collection.find({"status": "Removed", "isDeleted": {"$ne": True}}).sort("updatedAt", -1)
    removed_list = []
    
    async for equipment in cursor:
        equipment["_id"] = str(equipment["_id"])
        removed_list.append(equipment)
    
    return removed_list

@router.post("", status_code=201)
async def create_equipment(
    equipment: EquipmentCreate,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Create new equipment (Admin/Editor only)"""
    # require authentication
    user = verify_auth(auth_token)
    check_role(user, ["Admin", "Editor"])
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    # Generate asset ID
    category_prefix = equipment.category[:3].upper() if equipment.category else "OTH"
    count = await equipment_collection.count_documents({"category": equipment.category})
    asset_id = f"{category_prefix}-{str(count + 1).zfill(3)}-{str(datetime.now().timestamp())[-5:]}"
    
    # Check for duplicate serial number
    if equipment.serialNumber:
        existing = await equipment_collection.find_one({"serialNumber": equipment.serialNumber})
        if existing:
            raise HTTPException(status_code=400, detail="Serial Number already exists. Please use a unique serial number.")
    
    # Prepare equipment data
    equipment_data = equipment.dict(exclude_unset=True)
    equipment_data["assetId"] = asset_id
    equipment_data["isDeleted"] = False
    equipment_data["createdAt"] = datetime.utcnow()
    equipment_data["updatedAt"] = datetime.utcnow()
    
    # Parse dates
    if equipment_data.get("warrantyInfo"):
        try:
            equipment_data["warrantyInfo"] = datetime.fromisoformat(equipment_data["warrantyInfo"].replace('Z', '+00:00'))
        except:
            equipment_data["warrantyInfo"] = None
    
    if equipment_data.get("purchaseDate"):
        try:
            equipment_data["purchaseDate"] = datetime.fromisoformat(equipment_data["purchaseDate"].replace('Z', '+00:00'))
        except:
            equipment_data["purchaseDate"] = None
    
    result = await equipment_collection.insert_one(equipment_data)
    equipment_data["_id"] = str(result.inserted_id)
    
    return equipment_data

@router.put("/{equipment_id}")
async def update_equipment(
    equipment_id: str,
    equipment: EquipmentUpdate,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Update equipment (Admin/Editor only)"""
    user = verify_auth(auth_token)
    check_role(user, ["Admin", "Editor"])
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    # Validate ObjectId
    if not ObjectId.is_valid(equipment_id):
        raise HTTPException(status_code=400, detail="Invalid equipment ID")
    
    # Check if equipment exists
    existing = await equipment_collection.find_one({"_id": ObjectId(equipment_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Prepare update data
    update_data = equipment.dict(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow()
    
    # Parse dates
    if update_data.get("warrantyInfo"):
        try:
            update_data["warrantyInfo"] = datetime.fromisoformat(update_data["warrantyInfo"].replace('Z', '+00:00'))
        except:
            update_data["warrantyInfo"] = None
    
    if update_data.get("purchaseDate"):
        try:
            update_data["purchaseDate"] = datetime.fromisoformat(update_data["purchaseDate"].replace('Z', '+00:00'))
        except:
            update_data["purchaseDate"] = None
    
    # Clear damage description if status is not Damaged
    if update_data.get("status") and update_data["status"] != "Damaged":
        update_data["damageDescription"] = None
    
    result = await equipment_collection.update_one(
        {"_id": ObjectId(equipment_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Return updated equipment
    updated = await equipment_collection.find_one({"_id": ObjectId(equipment_id)})
    updated["_id"] = str(updated["_id"])
    
    return updated

@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: str,
    request: Request,
    auth_token: Optional[str] = Header(None, alias="x-auth-token")
):
    """Soft delete equipment (Admin only)"""
    user = verify_auth(auth_token)
    check_role(user, ["Admin"])
    
    db = request.app.mongodb
    equipment_collection = db["equipment"]
    
    # Validate ObjectId
    if not ObjectId.is_valid(equipment_id):
        raise HTTPException(status_code=400, detail="Invalid equipment ID")
    
    result = await equipment_collection.update_one(
        {"_id": ObjectId(equipment_id)},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    return {"message": "Equipment marked as deleted successfully"}