"""
TrustHire AI microservice.

This service is intended to be called by the backend only.
"""

import logging
import os
from typing import Any, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from interview_prep import InterviewPrepGenerator
from resume_parser import ResumeParser
from scam_detector import ScamDetector
from smart_matcher import SmartMatcher
from fraud_detector import FraudDetector, VoteRecord

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

AI_INTERNAL_SECRET = os.getenv("AI_INTERNAL_SECRET", "trusthire-local-secret")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000").split(",")
    if origin.strip()
]

app = FastAPI(
    title="TrustHire AI Service",
    description="Backend-only AI workflows for TrustHire.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "x-internal-secret"],
)

scam_detector = ScamDetector()
resume_parser = ResumeParser()
interview_prep = InterviewPrepGenerator()
smart_matcher = SmartMatcher()
fraud_detector = FraudDetector()


class JobAnalysisRequest(BaseModel):
    title: str
    description: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    requirements: List[str] = Field(default_factory=list)


class ScamAnalysisResponse(BaseModel):
    scam_score: float
    risk_level: str
    explanation: str
    extracted_red_flags: List[str]
    match_quality: str
    layer_results: dict[str, Any]


class MatchRequest(BaseModel):
    student_skills: List[str] = Field(default_factory=list)
    job_description: str
    job_requirements: List[str] = Field(default_factory=list)


class DiscussionSummaryRequest(BaseModel):
    messages: str
    job_id: str = ""


class DiscussionSummaryResponse(BaseModel):
    summary: str
    common_questions: List[str]
    interview_difficulty: str
    preparation_topics: List[str]


class PrepRequest(BaseModel):
    job_title: str
    job_description: str = ""
    required_skills: List[str] = Field(default_factory=list)
    student_skills: List[str] = Field(default_factory=list)


@app.middleware("http")
async def verify_internal_secret(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    internal_secret = request.headers.get("x-internal-secret")
    if internal_secret != AI_INTERNAL_SECRET:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized AI access"})

    return await call_next(request)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "TrustHire AI", "version": "2.0.0"}


@app.post("/predict-scam", response_model=ScamAnalysisResponse)
async def predict_scam(request: JobAnalysisRequest):
    try:
        result = scam_detector.analyze(
            title=request.title,
            description=request.description,
            salary_min=request.salary_min,
            salary_max=request.salary_max,
            requirements=request.requirements,
        )
        return result
    except Exception as error:
        logger.exception("Scam detection failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/match-job")
async def match_job(request: MatchRequest):
    try:
        return smart_matcher.calculate_match_score(
            student_skills=request.student_skills,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
        )
    except Exception as error:
        logger.exception("Job matching failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/summarize-discussion", response_model=DiscussionSummaryResponse)
async def summarize_discussion(request: DiscussionSummaryRequest):
    try:
        return interview_prep.summarize_discussion(request.messages)
    except Exception as error:
        logger.exception("Discussion summarization failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/generate-prep")
async def generate_prep(request: PrepRequest):
    try:
        return interview_prep.generate(
            job_title=request.job_title,
            job_description=request.job_description,
            required_skills=request.required_skills,
            student_skills=request.student_skills,
        )
    except Exception as error:
        logger.exception("Prep generation failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/extract-resume-skills")
async def extract_resume_skills(
    file: UploadFile = File(...),
    x_internal_secret: Optional[str] = Header(default=None),
):
    del x_internal_secret
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        content = await file.read()
        return resume_parser.parse(content, file.filename)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Resume extraction failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


class FraudCheckRequest(BaseModel):
    job_id: str = ""
    votes: List[dict] = Field(default_factory=list)


@app.post("/check-fraud")
async def check_fraud(request: FraudCheckRequest):
    """Check a list of votes for suspicious patterns on a single job."""
    try:
        vote_records = [
            VoteRecord(
                user_id=v.get("user_id", ""),
                vote_type=v.get("vote_type", "upvote"),
                weight=float(v.get("weight", 1)),
                created_at=v.get("created_at", ""),
                account_age_days=int(v.get("account_age_days", 999)),
            )
            for v in request.votes
        ]
        result = fraud_detector.check_votes(vote_records, job_id=request.job_id)
        return {
            "is_suspicious": result.is_suspicious,
            "risk_level": result.risk_level,
            "reasons": result.reasons,
            "details": result.details,
        }
    except Exception as error:
        logger.exception("Fraud detection failed")
        raise HTTPException(status_code=500, detail=str(error)) from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("AI_HOST", "0.0.0.0"),
        port=int(os.getenv("AI_PORT", "8000")),
        reload=os.getenv("AI_RELOAD", "true").lower() == "true",
    )
