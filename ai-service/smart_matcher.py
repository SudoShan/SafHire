import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class SmartMatcher:
    """
    Computes mathematical fit scores between Student Profiles and Job Descriptions
    using TF-IDF Vectorization and Cosine Similarity along with Boolean heuristics.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')

    def calculate_match_score(self, student_skills: List[str], job_description: str, job_requirements: List[str]) -> Dict:
        try:
            student_text = " ".join(student_skills)
            job_text = job_description + " " + " ".join(job_requirements)
            
            # Base case: Student has no skills logged
            if not student_text.strip():
                return {"fit_score": 0.0, "missing_skills": job_requirements, "matched_skills": []}
                
            # Compute Cosine Similarity between the two texts
            tfidf_matrix = self.vectorizer.fit_transform([student_text, job_text])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            nlp_sim_score = cosine_sim[0][0] * 100
            
            # Boolean Extraction logic for direct requirements
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
            final_score = (nlp_sim_score * 0.6) + (req_score * 0.4)
            fit_score = round(min(100.0, final_score), 2)

            if fit_score >= 75:
                fit_band = 'strong'
                explanation = 'Your profile aligns well with the role requirements and job language.'
            elif fit_score >= 45:
                fit_band = 'moderate'
                explanation = 'You match part of the stack, but a few important skills still need work.'
            else:
                fit_band = 'low'
                explanation = 'The role has notable gaps versus your current recorded skills.'
            
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
