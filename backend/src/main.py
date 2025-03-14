from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Import controllers
from src.controllers.auth_controller import router as auth_router
from src.controllers.project_controller import router as project_router
from src.controllers.integration_event_controller import router as integration_event_router
from src.controllers.key_decision_controller import router as key_decision_router
from src.controllers.knowledge_gap_controller import router as knowledge_gap_router
from src.controllers.ai_coach_controller import router as ai_coach_router
from src.controllers.kg_report_ai_controller import router as kg_report_ai_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="RLC Coach API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(project_router, prefix="/projects", tags=["projects"])
app.include_router(
    integration_event_router, 
    prefix="/projects/{project_id}/integration-events", 
    tags=["integration-events"]
)
app.include_router(
    key_decision_router, 
    prefix="/projects/{project_id}/key-decisions", 
    tags=["key-decisions"]
)
app.include_router(
    knowledge_gap_router, 
    prefix="/projects/{project_id}/knowledge-gaps", 
    tags=["knowledge-gaps"]
)
app.include_router(ai_coach_router, prefix="/ai-coach", tags=["ai-coach"])
app.include_router(kg_report_ai_router, prefix="/kg-report-ai", tags=["kg-report-ai"])

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to RLC Coach API"}

# Run server (for development)
if __name__ == "__main__":
    uvicorn.run(
        "src.main:app", 
        host=os.getenv("HOST", "0.0.0.0"), 
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )