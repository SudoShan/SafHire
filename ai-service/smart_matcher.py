import json
import logging
import os
import re

import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SmartMatcher:
    """
    Computes mathematical fit scores between Student Profiles and Job Descriptions
    using TF-IDF Vectorization and Cosine Similarity along with Boolean heuristics,
    blended 50/50 with an LLM-based semantic score from Groq.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')

    # ------------------------------------------------------------------ #
    #  Groq helper                                                         #
    # ------------------------------------------------------------------ #

    def _get_groq_score(self, student_skills: List[str], job_description: str, job_requirements: List[str]) -> float:
        """
        Ask Groq to evaluate the candidate fit and return a score 0–100.
        Returns 0.0 on any failure so the hybrid score gracefully degrades.
        """
        api_key = os.getenv("GROQ_KEY_ONE")
        if not api_key:
            logger.warning("GROQ_KEY_ONE not set — skipping AI score.")
            return 0.0

        prompt = f"""You are a technical recruiter evaluating a candidate's fit for a job.

Candidate skills: {", ".join(student_skills) if student_skills else "None listed"}

Job description: {job_description}

Required skills for the job: {", ".join(job_requirements) if job_requirements else "None listed"}

Assess how well this candidate fits the role. Consider:
- Skill overlap (direct and adjacent/transferable)
- Depth implied by the listed skills vs role seniority
- Any obvious gaps that would block the candidate

Return ONLY a valid JSON object, no markdown, no explanation:
{{
  "ai_score": <integer 0-100>,
  "ai_reasoning": "<one concise sentence explaining the score>"
}}"""

        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                },
                timeout=30,
            )
            if not response.ok:
                logger.error(f"Groq API error {response.status_code}: {response.text}")
                return 0.0

            raw = response.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown fences if model adds them
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            parsed = json.loads(raw)
            score = float(parsed.get("ai_score", 0))
            self._last_ai_reasoning = parsed.get("ai_reasoning", "")
            return max(0.0, min(100.0, score))

        except Exception as e:
            logger.error(f"Groq scoring error: {e}")
            return 0.0

    # ------------------------------------------------------------------ #
    #  Main method (signature unchanged)                                   #
    # ------------------------------------------------------------------ #

    def calculate_match_score(self, student_skills: List[str], job_description: str, job_requirements: List[str]) -> Dict:
        try:
            self._last_ai_reasoning = ""

            student_text = " ".join(student_skills)
            job_text = job_description + " " + " ".join(job_requirements)

            # Base case: Student has no skills logged
            if not student_text.strip():
                return {"fit_score": 0.0, "missing_skills": job_requirements, "matched_skills": []}

            # ── 1. Original TF-IDF + keyword logic ─────────────────────────── #

            tfidf_matrix = self.vectorizer.fit_transform([student_text, job_text])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            nlp_sim_score = cosine_sim[0][0] * 100

            matched_skills = []
            missing_skills = []
            student_skills_lower = [s.lower() for s in student_skills]

            for req in job_requirements:
                if req.lower() in student_skills_lower or req.lower() in student_text.lower():
                    matched_skills.append(req)
                else:
                    missing_skills.append(req)

            # Hybrid Score Formulation (60% ML Vector Similarity + 40% Keyword Heuristics)
            req_score = (len(matched_skills) / max(1, len(job_requirements))) * 100
            tfidf_score = round(min(100.0, (nlp_sim_score * 0.6) + (req_score * 0.4)), 2)

            # ── 2. Groq AI score ────────────────────────────────────────────── #

            ai_score = self._get_groq_score(student_skills, job_description, job_requirements)

            # ── 3. Blend 50 / 50 ────────────────────────────────────────────── #

            fit_score = round((tfidf_score * 0.5) + (ai_score * 0.5), 2)

            # ── 4. Band + explanation ────────────────────────────────────────── #

            if fit_score >= 75:
                fit_band = 'strong'
                explanation = 'Your profile aligns well with the role requirements and job language.'
            elif fit_score >= 45:
                fit_band = 'moderate'
                explanation = 'You match part of the stack, but a few important skills still need work.'
            else:
                fit_band = 'low'
                explanation = 'The role has notable gaps versus your current recorded skills.'

            # Append AI reasoning when available
            if self._last_ai_reasoning:
                explanation = f"{explanation} AI insight: {self._last_ai_reasoning}"

            return {
                "fit_score": fit_score,
                "fit_band": fit_band,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "nlp_similarity": round(nlp_sim_score, 2),
                "explanation": explanation,
            }

        except Exception as e:
            logger.error(f"Matcher logic error: {e}")
            return {
                "fit_score": 0.0,
                "fit_band": "low",
                "matched_skills": [],
                "missing_skills": job_requirements,
                "explanation": "Unable to compute a reliable match score right now.",
                "error": str(e)
            }