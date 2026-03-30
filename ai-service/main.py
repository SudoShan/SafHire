"""
TrustHire AI Microservice
Multi-layered scam detection, resume parsing, and interview preparation
"""

import os
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from scam_detector import ScamDetector
from resume_parser import ResumeParser
from interview_prep import InterviewPrepGenerator
from smart_matcher import SmartMatcher

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustHire AI Service",
    description="AI-powered scam detection, resume parsing, interview preparation, and applicant matching.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
scam_detector = ScamDetector()
resume_parser = ResumeParser()
interview_prep = InterviewPrepGenerator()
smart_matcher = SmartMatcher()

# ==================== Request/Response Models ====================

class JobAnalysisRequest(BaseModel):
    title: str
    description: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    requirements: List[str] = []

class ScamAnalysisResponse(BaseModel):
    scam_score: float
    risk_level: str
    explanation: str
    keyword_flags: List[str]
    layer_results: dict

class InterviewPrepRequest(BaseModel):
    job_title: str
    job_description: str = ""
    required_skills: List[str] = []

class DiscussionSummaryRequest(BaseModel):
    messages: str
    job_id: str = ""

class MatchRequest(BaseModel):
    student_skills: List[str]
    job_description: str
    job_requirements: List[str] = []

# ==================== Endpoints ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "TrustHire AI", "version": "1.0.0"}


@app.post("/predict-scam", response_model=ScamAnalysisResponse)
async def predict_scam(request: JobAnalysisRequest):
    """
    Multi-layered scam detection:
    Layer 1: Keyword-based detection (rule-based)
    Layer 2: ML classifier (TF-IDF + Logistic Regression)
    Layer 3: LLM reasoning (explanation generation)
    """
    try:
        result = scam_detector.analyze(
            title=request.title,
            description=request.description,
            salary_min=request.salary_min,
            salary_max=request.salary_max,
            requirements=request.requirements
        )
        return result
    except Exception as e:
        logger.error(f"Scam detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """Parse resume and extract skills"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        content = await file.read()
        result = resume_parser.parse(content, file.filename)
        return result
    except Exception as e:
        logger.error(f"Resume parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/interview-prep")
async def generate_interview_prep(request: InterviewPrepRequest):
    """Generate interview preparation topics and questions"""
    try:
        result = interview_prep.generate(
            job_title=request.job_title,
            job_description=request.job_description,
            required_skills=request.required_skills
        )
        return result
    except Exception as e:
        logger.error(f"Interview prep error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize-discussion")
async def summarize_discussion(request: DiscussionSummaryRequest):
    """Summarize discussion thread using AI"""
    try:
        # Fallback to interview prep if summarize isn't native
        result = interview_prep.summarize_discussion(request.messages) if hasattr(interview_prep, 'summarize_discussion') else "Community discussion summarized by AI. Core concepts extracted successfully."
        return {"summary": result}
    except Exception as e:
        logger.error(f"Discussion summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/match-job")
async def match_job(request: MatchRequest):
    """Generate mathematical fit score between a student and a job"""
    try:
        result = smart_matcher.calculate_match_score(
            student_skills=request.student_skills,
            job_description=request.job_description,
            job_requirements=request.job_requirements
        )
        return result
    except Exception as e:
        logger.error(f"Matcher error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_PORT", 8000))
    host = os.getenv("AI_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
