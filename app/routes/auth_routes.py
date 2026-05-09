from fastapi import APIRouter, Depends, HTTPException
import bcrypt
from app.models.user import User
from app.database import user_collection
from app.auth import create_access_token, require_roles

router = APIRouter()

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

async def create_user(user: User, role: str):

    existing = await user_collection.find_one({"username": user.username})

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = hash_password(user.password)

    await user_collection.insert_one({
        "username": user.username,
        "password": hashed_password,
        "role": role
    })

    return {
        "message": "User registered successfully",
        "role": role
    }


@router.post("/register")
async def register(user: User):
    return await create_user(user, "member")


@router.post("/users")
async def create_user_by_admin(
    user: User,
    current_user: dict = Depends(require_roles("admin"))
):
    return await create_user(user, user.role)


@router.post("/login")
async def login(user: User):

    db_user = await user_collection.find_one({"username": user.username})

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = db_user.get("role", "member")

    token = create_access_token({
        "sub": db_user["username"],
        "role": role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role
    }
