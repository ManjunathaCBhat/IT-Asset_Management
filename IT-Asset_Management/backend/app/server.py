import os
import io
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import tempfile
import smtplib
from email.message import EmailMessage
import secrets

load_dotenv()

# ======================== ENV ========================
MONGO_URI = os.getenv('MONGO_URI')
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
SMTP_HOST = os.getenv('SMTP_HOST')
SMTP_PORT = int(os.getenv('SMTP_PORT', '0')) if os.getenv('SMTP_PORT') else None
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')
SENDGRID_FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL')

# ====================== SECURITY =====================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

# ======================= APP ========================
client: Optional[AsyncIOMotorClient] = None
db = None
reset_tokens = {}  # in-memory reset tokens


# ===================== UTILS ========================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=2))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(x_auth_token: str = Header(None)):
    if not x_auth_token:
        raise HTTPException(status_code=401, detail="No token provided")
    try:
        payload = jwt.decode(x_auth_token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload.get('user')
    except JWTError:
        raise HTTPException(status_code=401, detail="Token is not valid")

def require_role(user: dict, roles: List[str]):
    if not user or user.get('role') not in roles:
        raise HTTPException(status_code=403, detail='Access denied. Insufficient role.')

async def send_email_smtp(to_email: str, subject: str, html_content: str, attachments: List[str] = None):
    if not SMTP_HOST or not SMTP_PORT or not SMTP_USER or not SMTP_PASS:
        raise RuntimeError('Missing SMTP configuration')
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SENDGRID_FROM_EMAIL or SMTP_USER
    msg['To'] = to_email
    msg.set_content('This is an HTML email. Please use an email client that supports HTML.')
    msg.add_alternative(html_content, subtype='html')
    if attachments:
        for path in attachments:
            with open(path, 'rb') as f:
                data = f.read()
            msg.add_attachment(data, maintype='application', subtype='pdf', filename=os.path.basename(path))
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASS)
    server.send_message(msg)
    server.quit()

def generate_asset_pdf(equipment: dict, assignee: dict) -> str:
    fd, tmp_path = tempfile.mkstemp(suffix='.pdf')
    os.close(fd)
    c = canvas.Canvas(tmp_path, pagesize=letter)
    width, height = letter
    y = height - 50
    c.setFont('Helvetica-Bold', 16)
    c.drawCentredString(width/2, y, 'IT ASSET ASSIGNMENT ACKNOWLEDGEMENT')
    y -= 40
    c.setFont('Helvetica-Bold', 12)
    c.drawString(50, y, 'ASSET DETAILS')
    y -= 20
    c.setFont('Helvetica', 10)
    fields = [
        ('Asset ID', equipment.get('assetId')),
        ('Category', equipment.get('category')),
        ('Model', equipment.get('model')),
        ('Serial Number', equipment.get('serialNumber')),
        ('Status', equipment.get('status')),
        ('Location', equipment.get('location')),
    ]
    for k, v in fields:
        c.drawString(60, y, f"{k}: {v if v is not None else 'N/A'}")
        y -= 14
    y -= 10
    c.setFont('Helvetica-Bold', 12)
    c.drawString(50, y, 'ASSIGNEE DETAILS')
    y -= 20
    c.setFont('Helvetica', 10)
    for k, v in [('Name', assignee.get('assigneeName')), ('Position', assignee.get('position')), ('Email', assignee.get('employeeEmail'))]:
        c.drawString(60, y, f"{k}: {v if v is not None else 'N/A'}")
        y -= 14
    y -= 30
    c.drawString(60, y, 'Employee Signature: ________________________    Date: ________________')
    c.showPage()
    c.save()
    return tmp_path


# ====================== LIFESPAN ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = AsyncIOMotorClient(MONGO_URI) if MONGO_URI else None
    db = client.get_default_database() if client else None
    # Ensure admin exists
    if db:
        users = db.get_collection('users')
        if not await users.find_one({'email': 'admin@example.com'}):
            hashed = hash_password('password123')
            await users.insert_one({'name': 'Admin', 'email': 'admin@example.com', 'password': hashed, 'role': 'Admin'})
    yield
    if client:
        client.close()

app = FastAPI(title="IT Asset Management - FastAPI port", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================== Pydantic MODELS ==================
class LoginModel(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordModel(BaseModel):
    email: EmailStr

class ResetPasswordModel(BaseModel):
    email: EmailStr
    token: str
    newPassword: str

# ====================== ROUTES =======================
@app.post('/api/users/login')
async def login(body: LoginModel):
    if not db:
        raise HTTPException(status_code=500, detail='DB not configured')
    user = await db.get_collection('users').find_one({'email': body.email})
    if not user or not verify_password(body.password, user['password']):
        raise HTTPException(status_code=400, detail='Invalid credentials')
    payload = {'user': {'id': str(user['_id']), 'role': user.get('role'), 'email': user.get('email')}}
    token = create_access_token(payload)
    return {'token': token, 'user': payload['user']}


@app.post('/api/forgot-password')
async def forgot_password(body: ForgotPasswordModel):
    if not db:
        raise HTTPException(status_code=500, detail='DB not configured')
    user = await db.get_collection('users').find_one({'email': body.email})
    if not user:
        raise HTTPException(status_code=404, detail='No account found with that email address.')
    reset_token = secrets.token_hex(32)
    expiry = (datetime.utcnow() + timedelta(hours=1)).timestamp()
    reset_tokens[reset_token] = {'email': body.email, 'expiry': expiry}
    reset_link = f"{API_BASE_URL}/reset-password?token={reset_token}&email={body.email}"
    html = f"<p>Reset link: <a href=\"{reset_link}\">{reset_link}</a></p>"
    await asyncio.to_thread(send_email_smtp, body.email, 'Password Reset', html)
    return {'success': True, 'message': 'Password reset link sent successfully.'}


@app.post('/api/reset-password')
async def reset_password(body: ResetPasswordModel):
    token_data = reset_tokens.get(body.token)
    if not token_data or token_data['expiry'] < datetime.utcnow().timestamp() or token_data['email'] != body.email:
        raise HTTPException(status_code=400, detail='Invalid or expired token')
    user = await db.get_collection('users').find_one({'email': body.email})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    hashed = hash_password(body.newPassword)
    await db.get_collection('users').update_one({'_id': user['_id']}, {'$set': {'password': hashed}})
    del reset_tokens[body.token]
    return {'success': True, 'message': 'Password reset successfully!'}


@app.get('/api/users')
async def list_users(current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin'])
    users = []
    cursor = db.get_collection('users').find({}, {'password': 0})
    async for u in cursor:
        u['_id'] = str(u['_id'])
        users.append(u)
    return users


@app.post('/api/users/create')
async def create_user(body: dict, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin'])
    users = db.get_collection('users')
    if await users.find_one({'email': body.get('email')}):
        raise HTTPException(status_code=400, detail='User already exists')
    hashed = hash_password(body.get('password'))
    doc = {'name': body.get('name'), 'email': body.get('email'), 'password': hashed, 'role': body.get('role')}
    await users.insert_one(doc)
    return {'msg': 'User created successfully'}


@app.put('/api/users/{user_id}')
async def update_user(user_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin'])
    users = db.get_collection('users')
    update = {}
    for f in ('name', 'email', 'role'):
        if f in body:
            update[f] = body[f]
    if 'password' in body and body.get('password'):
        update['password'] = hash_password(body.get('password'))
    result = await users.update_one({'_id': AsyncIOMotorClient().get_default_database().codec_options.__class__}, {'$set': update})
    # simple response
    return {'msg': 'User updated successfully'}


@app.delete('/api/users/{user_id}')
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin'])
    if user_id == current_user.get('id'):
        raise HTTPException(status_code=400, detail='Cannot delete your own account')
    res = await db.get_collection('users').delete_one({'_id': user_id})
    return {'msg': 'User deleted'}


@app.get('/api/equipment')
async def get_equipment(current_user: dict = Depends(get_current_user)):
    cursor = db.get_collection('equipment').find({'isDeleted': {'$ne': True}}).sort('createdAt', -1)
    out = []
    async for it in cursor:
        it['_id'] = str(it['_id'])
        out.append(it)
    return out


@app.post('/api/equipment')
async def create_equipment(body: dict, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin', 'Editor'])
    doc = body.copy()
    if 'warrantyInfo' in doc and doc['warrantyInfo']:
        try:
            doc['warrantyInfo'] = datetime.fromisoformat(doc['warrantyInfo'])
        except Exception:
            doc['warrantyInfo'] = None
    doc['createdAt'] = datetime.utcnow()
    res = await db.get_collection('equipment').insert_one(doc)
    doc['_id'] = str(res.inserted_id)
    return doc


@app.put('/api/equipment/{item_id}')
async def update_equipment(item_id: str, body: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin', 'Editor'])
    equipments = db.get_collection('equipment')
    orig = await equipments.find_one({'_id': item_id})
    if not orig:
        raise HTTPException(status_code=404, detail='Equipment not found')
    update = body.copy()
    if 'warrantyInfo' in update and update['warrantyInfo']:
        try:
            update['warrantyInfo'] = datetime.fromisoformat(update['warrantyInfo'])
        except Exception:
            update['warrantyInfo'] = None
    await equipments.update_one({'_id': item_id}, {'$set': update})
    updated = await equipments.find_one({'_id': item_id})

    is_new_assignment = (
        update.get('status') == 'In Use' and update.get('assigneeName') and update.get('employeeEmail') and
        (orig.get('status') != 'In Use' or orig.get('assigneeName') != update.get('assigneeName'))
    )
    if is_new_assignment:
        # generate pdf and send email in background
        def bg_task():
            try:
                assignee = {k: update.get(k) for k in ('assigneeName', 'position', 'department', 'employeeEmail', 'phoneNumber')}
                pdf_path = generate_asset_pdf(updated, assignee)
                try:
                    send_email_smtp(assignee.get('employeeEmail'), f"IT Asset Assignment: {updated.get('assetId')}", '<p>Please see attached</p>', [pdf_path])
                except Exception:
                    pass
                try:
                    os.remove(pdf_path)
                except Exception:
                    pass
            except Exception:
                pass
        background_tasks.add_task(asyncio.to_thread, bg_task)

    updated['_id'] = str(updated['_id'])
    return updated


@app.delete('/api/equipment/{item_id}')
async def delete_equipment(item_id: str, current_user: dict = Depends(get_current_user)):
    require_role(current_user, ['Admin'])
    res = await db.get_collection('equipment').update_one({'_id': item_id}, {'$set': {'isDeleted': True}})
    return {'message': 'Equipment marked as deleted successfully'}