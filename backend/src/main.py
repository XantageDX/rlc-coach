from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

import logging

# Import controllers
from src.controllers.auth_controller import router as auth_router
from src.controllers.ai_coach_controller import router as ai_coach_router
from src.controllers.report_ai_controller import router as report_ai_router
from src.controllers.archive_controller import router as archive_router
from src.controllers.user_admin_controller import router as user_admin_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="RLC Coach API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",  # React development server
#         "http://127.0.0.1:3000",
#         "https://d22ybva4cupp8q.cloudfront.net",  # CloudFront distribution
#         #"http://rlc-coach-frontend.s3-website-us-east-1.amazonaws.com"  # Be cautious with this in production
#         "https://rapidlearningcycles.xantage.co",  # Custom domain
#         "https://api.rapidlearningcycles.xantage.co"  # Add this line
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["Content-Disposition"],  # Important for file downloads
# )
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://d22ybva4cupp8q.cloudfront.net",
        #"https://rapidlearningcycles.xantage.co"
        "https://spark.rapidlearningcycles.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
    max_age=3600,  # Add this to cache preflight requests
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(ai_coach_router, prefix="/ai-coach", tags=["ai-coach"])
app.include_router(report_ai_router, prefix="/report-ai", tags=["report-ai"])
app.include_router(archive_router, prefix="/archive", tags=["archive"])
app.include_router(user_admin_router, prefix="/admin", tags=["user-admin"])


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.access")

# Create a middleware for request logging
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request received: {request.method} {request.url}")
    logger.info(f"Request headers: {request.headers}")
    try:
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to RLC Coach API"}

@app.options("/{path:path}")
async def options_route(path: str):
    """
    Handle OPTIONS requests for CORS preflight.
    """
    return Response(status_code=200)

# Run server (for development)
if __name__ == "__main__":
    uvicorn.run(
    "src.main:app",
    host=os.getenv("HOST", "0.0.0.0"),
    port=int(os.getenv("PORT", 8000)),
    reload=True
    )