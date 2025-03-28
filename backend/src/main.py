from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Import controllers
from src.controllers.auth_controller import router as auth_router
# from src.controllers.project_controller import router as project_router
# from src.controllers.integration_event_controller import router as integration_event_router
# from src.controllers.key_decision_controller import router as key_decision_router
# from src.controllers.knowledge_gap_controller import router as knowledge_gap_router
from src.controllers.ai_coach_controller import router as ai_coach_router
from src.controllers.report_ai_controller import router as report_ai_router
from src.controllers.archive_controller import router as archive_router
from src.controllers.user_admin_controller import router as user_admin_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="RLC Coach API")

# Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # More permissive for development
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://127.0.0.1:3000",
        "*"  # Be cautious with this in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Important for file downloads
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
# app.include_router(project_router, prefix="/projects", tags=["projects"])
# app.include_router(
# integration_event_router,
# prefix="/projects/{project_id}/integration-events",
# tags=["integration-events"]
# )
# app.include_router(
# key_decision_router,
# prefix="/projects/{project_id}/key-decisions",
# tags=["key-decisions"]
# )
# app.include_router(
# knowledge_gap_router,
# prefix="/projects/{project_id}/knowledge-gaps",
# tags=["knowledge-gaps"]
# )
app.include_router(ai_coach_router, prefix="/ai-coach", tags=["ai-coach"])
app.include_router(report_ai_router, prefix="/report-ai", tags=["report-ai"])
app.include_router(archive_router, prefix="/archive", tags=["archive"])
app.include_router(user_admin_router, prefix="/admin", tags=["user-admin"])

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to RLC Coach API"}

# @app.middleware("http")
# async def options_middleware(request, call_next):
#     if request.method == "OPTIONS":
#         return Response(status_code=200)
#     return await call_next(request)

# Run server (for development)
if __name__ == "__main__":
    uvicorn.run(
    "src.main:app",
    host=os.getenv("HOST", "0.0.0.0"),
    port=int(os.getenv("PORT", 8000)),
    reload=True
    )