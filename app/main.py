from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routes import books
from app.routes import members
from app.routes import borrow
from app.routes import uploads
from app.routes import analytics
from app.routes import auth_routes
from app.database import database


app = FastAPI(
    title="LibTrack API Platform",
    description="Smart Library & Inventory Management System",
    version="1.0.0",
    contact={
        "name": "LibTrack Support",
        "email": "support@libtrack.com"
    },
    license_info={
        "name": "MIT"
    }
)

@app.on_event("startup")
async def startup_db():

    try:
        await database.command("ping")
        print("MongoDB Connected Successfully")

    except Exception as e:
        print(e)
# -----------------------------
# CORS Configuration
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Global Exception Handlers
# -----------------------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation Error",
            "errors": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal Server Error",
            "error": str(exc)
        }
    )

# -----------------------------
# Startup Event
# -----------------------------

@app.on_event("startup")
async def startup_event():
    print("LibTrack API Server Started")

# -----------------------------
# Root Route
# -----------------------------

@app.get("/", tags=["Root"])
async def home():
    return {
        "success": True,
        "message": "LibTrack API Running Successfully"
    }

# -----------------------------
# Health Check Route
# -----------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "OK",
        "service": "LibTrack API"
    }

# -----------------------------
# Include Routers
# -----------------------------

app.include_router(
    auth_routes.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    books.router,
    prefix="/api/v1/books",
    tags=["Books"]
)

app.include_router(
    members.router,
    prefix="/api/v1/members",
    tags=["Members"]
)

app.include_router(
    borrow.router,
    prefix="/api/v1/library",
    tags=["Borrowing"]
)

app.include_router(
    uploads.router,
    prefix="/api/v1/upload",
    tags=["CSV Upload"]
)

app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)

