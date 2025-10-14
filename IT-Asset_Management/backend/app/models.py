from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class UserRole(str, Enum):
    ADMIN = "Admin"
    EDITOR = "Editor"
    VIEWER = "Viewer"

class EquipmentStatus(str, Enum):
    IN_USE = "In Use"
    IN_STOCK = "In Stock"
    DAMAGED = "Damaged"
    E_WASTE = "E-Waste"
    REMOVED = "Removed"

class ClientEnum(str, Enum):
    DELOITTE = "Deloitte"
    LIONGUARD = "Lionguard"
    COGNIZANT = "Cognizant"

# ==================== USER MODELS ====================

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: UserRole = UserRole.VIEWER

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[UserRole] = None

class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ==================== EQUIPMENT MODELS ====================

class EquipmentBase(BaseModel):
    assetId: str
    category: str
    status: EquipmentStatus
    model: Optional[str] = None
    serialNumber: Optional[str] = None
    warrantyInfo: Optional[datetime] = None
    location: Optional[str] = None
    comment: Optional[str] = None
    assigneeName: Optional[str] = None
    position: Optional[str] = None
    employeeEmail: Optional[EmailStr] = None
    phoneNumber: Optional[str] = None
    department: Optional[str] = None
    damageDescription: Optional[str] = None
    purchasePrice: Optional[float] = 0.0
    purchaseDate: Optional[datetime] = None
    client: Optional[ClientEnum] = None
    isDeleted: bool = False

class EquipmentCreate(BaseModel):
    category: str
    status: EquipmentStatus = EquipmentStatus.IN_STOCK
    model: Optional[str] = None
    serialNumber: Optional[str] = None
    warrantyInfo: Optional[str] = None  # ISO format string
    location: Optional[str] = None
    comment: Optional[str] = None
    assigneeName: Optional[str] = None
    position: Optional[str] = None
    employeeEmail: Optional[EmailStr] = None
    phoneNumber: Optional[str] = None
    department: Optional[str] = None
    damageDescription: Optional[str] = None
    purchasePrice: Optional[float] = 0.0
    purchaseDate: Optional[str] = None  # ISO format string
    client: Optional[ClientEnum] = None

class EquipmentUpdate(BaseModel):
    category: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    model: Optional[str] = None
    serialNumber: Optional[str] = None
    warrantyInfo: Optional[str] = None
    location: Optional[str] = None
    comment: Optional[str] = None
    assigneeName: Optional[str] = None
    position: Optional[str] = None
    employeeEmail: Optional[EmailStr] = None
    phoneNumber: Optional[str] = None
    department: Optional[str] = None
    damageDescription: Optional[str] = None
    purchasePrice: Optional[float] = None
    purchaseDate: Optional[str] = None
    client: Optional[ClientEnum] = None
    isDeleted: Optional[bool] = None

class EquipmentResponse(EquipmentBase):
    id: str = Field(..., alias="_id")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ==================== EMAIL MODELS ====================

class EmailSend(BaseModel):
    to: EmailStr
    subject: str
    message: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    token: str
    newPassword: str = Field(..., min_length=6)

# ==================== TOKEN MODELS ====================

class Token(BaseModel):
    token: str
    user: dict

# ==================== SUMMARY MODELS ====================

class EquipmentSummary(BaseModel):
    totalAssets: int
    inUse: int
    inStock: int
    damaged: int
    eWaste: int
    removed: int

class CategoryCount(BaseModel):
    count: int