from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
import bcrypt
from pathlib import Path

# Load environment variables
load_dotenv()

# Import routes and pydantic models from backend package
from backend.app import routes as backend_routes
from backend.app.routes import auth, users, equipment, email
from backend.models import UserLogin, Token, ForgotPassword, ResetPassword

app = FastAPI(
    title="IT Asset Management API",
    description="API for managing IT assets",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
@app.on_event("startup")
async def startup_db_client():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("WARNING: MONGO_URI not found in environment variables")
        return
    
    app.mongodb_client = AsyncIOMotorClient(mongo_uri)
    app.mongodb = app.mongodb_client[os.getenv("DB_NAME", "asset_management")]
    print(f"✅ MongoDB connected successfully to database: {os.getenv('DB_NAME', 'asset_management')}")
    
    # Ensure indexes and seed admin user
    try:
        await ensure_indexes(app.mongodb)
    except Exception as e:
        print(f"Error ensuring indexes: {e}")

    await seed_admin_user(app.mongodb)


async def ensure_indexes(db):
    """Create required indexes for users and equipment collections."""
    users = db["users"]
    equipment = db["equipment"]

    # Users: unique email
    try:
        await users.create_index("email", unique=True)
        print("✅ Created/ensured unique index on users.email")
    except Exception as e:
        print(f"Could not create index on users.email: {e}")

    # Equipment: unique assetId and (sparse) serialNumber
    try:
        await equipment.create_index("assetId", unique=True)
        print("✅ Created/ensured unique index on equipment.assetId")
    except Exception as e:
        print(f"Could not create index on equipment.assetId: {e}")

    try:
        # serialNumber may be missing on many docs; sparse avoids rejecting null duplicates
        await equipment.create_index("serialNumber", unique=True, sparse=True)
        print("✅ Created/ensured unique sparse index on equipment.serialNumber")
    except Exception as e:
        print(f"Could not create index on equipment.serialNumber: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if hasattr(app, 'mongodb_client'):
        app.mongodb_client.close()
        print("MongoDB connection closed")

# Include API routes
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(equipment.router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(email.router, tags=["Email"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "IT Asset Management API is running"}


@app.get("/internal/db-status")
async def db_status():
    """Diagnostic endpoint: reports DB connection, admin user presence, and indexes."""
    status = {
        "db_connected": False,
        "db_name": None,
        "admin_exists": False,
        "users_indexes": [],
        "equipment_indexes": [],
    }

    if not hasattr(app, 'mongodb') or app.mongodb is None:
        return status

    status['db_connected'] = True
    status['db_name'] = app.mongodb.name

    users = app.mongodb['users']
    equipment = app.mongodb['equipment']

    admin = await users.find_one({'email': 'admin@example.com'})
    status['admin_exists'] = bool(admin)

    try:
        async for idx in users.list_indexes():
            status['users_indexes'].append(idx['name'])
    except Exception:
        status['users_indexes'] = ['error_reading_indexes']

    try:
        async for idx in equipment.list_indexes():
            status['equipment_indexes'].append(idx['name'])
    except Exception:
        status['equipment_indexes'] = ['error_reading_indexes']

    return status

# Serve React static files
frontend_build_path = Path(__file__).parent / "frontend" / "build"

if frontend_build_path.exists():
    print(f"✅ Frontend build found at: {frontend_build_path}")
    
    # Serve static files (JS, CSS, images, etc.)
    app.mount("/static", StaticFiles(directory=str(frontend_build_path / "static")), name="static")
    
    # Serve favicon and manifest
    @app.get("/favicon.ico")
    async def favicon():
        favicon_path = frontend_build_path / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(str(favicon_path))
        return {"error": "Favicon not found"}
    
    @app.get("/manifest.json")
    async def manifest():
        manifest_path = frontend_build_path / "manifest.json"
        if manifest_path.exists():
            return FileResponse(str(manifest_path))
        return {"error": "Manifest not found"}
    
    @app.get("/logo192.png")
    async def logo192():
        logo_path = frontend_build_path / "logo192.png"
        if logo_path.exists():
            return FileResponse(str(logo_path))
        return {"error": "Logo not found"}
    
    # Catch-all route for React Router (SPA)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/") or full_path.startswith("health"):
            return {"error": "API route not found"}
        
        # Serve index.html for all other routes
        index_file = frontend_build_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"error": "Frontend not found"}
else:
    print("⚠️  Frontend build not found. Please run: cd frontend && npm run build")
    
    @app.get("/")
    async def root():
        return {
            "message": "IT Asset Management API",
            "status": "Backend is running",
            "note": "Frontend build not found. Run 'cd frontend && npm run build'",
            "docs": "/docs",
            "health": "/health"
        }

async def seed_admin_user(db):
    """Create default admin user if not exists"""
    admin_email = "admin@example.com"
    users_collection = db["users"]
    
    existing_admin = await users_collection.find_one({"email": admin_email})
    
    if not existing_admin:
        hashed_password = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        admin_user = {
            "name": "Admin",
            "email": admin_email,
            "password": hashed_password.decode('utf-8'),
            "role": "Admin"
        }
        await users_collection.insert_one(admin_user)
        print(f"✅ Admin user created: {admin_email} / password123")
    else:
        print("ℹ️  Admin user already exists")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    print(f"\n{'='*60}")
    print(f"🚀 Starting IT Asset Management Server")
    print(f"{'='*60}")
    print(f"📍 Server: http://localhost:{port}")
    print(f"📚 API Docs: http://localhost:{port}/docs")
    print(f"🏥 Health: http://localhost:{port}/health")
    print(f"{'='*60}\n")
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)