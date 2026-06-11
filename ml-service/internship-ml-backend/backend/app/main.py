from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routers.student_api import router as student_router
from backend.app.routers.admin_api import router as admin_router

app = FastAPI(title="Internship ML Backend")

# CORS - allow all for development; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(student_router, prefix="/student", tags=["Student"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "ML Backend API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "service": "pm-internship-ml"}
