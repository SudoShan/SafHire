"""
TrustHire Resume Parser
Extracts skills and info from PDF/DOCX resumes
"""

import re
import json
import logging
import os
import requests
from typing import List
from dotenv import load_dotenv

load_dotenv()  # Loads variables from .env into os.environ

logger = logging.getLogger(__name__)


class ResumeParser:
    def __init__(self):
        self._groq_cache: dict = {}

    # ------------------------------------------------------------------ #
    #  Groq helpers                                                        #
    # ------------------------------------------------------------------ #

    def _call_groq(self, prompt: str) -> str:
        """Send a prompt to Groq and return the raw text response."""
        api_key = os.getenv("GROQ_KEY_ONE")
        if not api_key:
            raise EnvironmentError("GROQ_KEY_ONE is not set in environment variables.")

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
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _parse_all_with_groq(self, text: str) -> dict:
        """
        Single Groq call that extracts every field we need.
        Result is cached on self._groq_cache for the lifetime of this parse run.
        """
        # Truncate to ~4000 chars to stay well within token limits
        snippet = text[:4000]

        prompt = f"""You are a resume-parsing assistant. Extract information from the resume text below and return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

Resume text:
\"\"\"
{snippet}
\"\"\"

Return a JSON object with exactly these keys:
{{
  "name":        "<full candidate name. For eg: even if name is given like vi s h a l s, change it to Vishal S properly., empty string if not found>",
  "email":       "<email address, empty string if not found>",
  "phone":       "<phone number as a string, empty string if not found>",
  "cgpa":        "<CGPA or GPA value e.g. '8.5', empty string if not found>",
  "batch_year":  "<graduation / batch year e.g. '2027' if degree is from 2023-2027, empty string if not found>",
  "department":  "<department or field of study e.g. 'Computer Science', empty string if not found>",
  "skills":      ["list", "of", "technical", "skills"],
  "education":   ["list", "of", "education", "qualifications", "e.g. B.Tech, M.Tech"]
}}"""

        try:
            raw = self._call_groq(prompt).strip()

            # Strip accidental markdown code fences if the model adds them
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            return json.loads(raw)

        except Exception as e:
            logger.error(f"Groq parse error: {e}")
            return {}

    # ------------------------------------------------------------------ #
    #  Public entry point                                                  #
    # ------------------------------------------------------------------ #

    def parse(self, content: bytes, filename: str) -> dict:
        """Parse resume file and extract information"""
        try:
            ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

            if ext == "pdf":
                text = self._extract_pdf(content)
            elif ext in ("doc", "docx"):
                text = self._extract_docx(content)
            else:
                text = content.decode("utf-8", errors="ignore")

            # One Groq call for all fields; individual helpers read from the cache
            self._groq_cache = self._parse_all_with_groq(text)

            skills     = self._extract_skills(text)
            email      = self._extract_email(text)
            phone      = self._extract_phone(text)
            education  = self._extract_education(text)
            name       = self._extract_name(text)
            cgpa       = self._extract_cgpa(text)
            batch_year = self._extract_batch_year(text)
            department = self._extract_department(text)

            return {
                "skills":      skills,
                "email":       email,
                "phone":       phone,
                "education":   education,
                "name":        name,
                "cgpa":        cgpa,
                "batch_year":  batch_year,
                "department":  department,
                "text_length": len(text),
                "parsed":      True,
            }
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {"skills": [], "parsed": False, "error": str(e)}

    # ------------------------------------------------------------------ #
    #  File extractors (unchanged)                                         #
    # ------------------------------------------------------------------ #

    def _extract_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            from PyPDF2 import PdfReader
            import io
            reader = PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def _extract_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            from docx import Document
            import io
            doc = Document(io.BytesIO(content))
            return "\n".join([para.text for para in doc.paragraphs])
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return ""

    # ------------------------------------------------------------------ #
    #  Field extractors — now powered by the cached Groq response         #
    # ------------------------------------------------------------------ #

    def _extract_cgpa(self, text: str) -> str:
        """Extract CGPA/GPA from resume text."""
        return self._groq_cache.get("cgpa", "") or ""

    def _extract_batch_year(self, text: str) -> str:
        """Extract graduation/batch year from resume text."""
        return self._groq_cache.get("batch_year", "") or ""

    def _extract_department(self, text: str) -> str:
        """Extract department/field of study from resume text."""
        return self._groq_cache.get("department", "") or ""

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text."""
        skills = self._groq_cache.get("skills", [])
        if not isinstance(skills, list):
            return []
        return sorted(str(s) for s in skills if s)

    def _extract_email(self, text: str) -> str:
        """Extract email from resume text."""
        return self._groq_cache.get("email", "") or ""

    def _extract_phone(self, text: str) -> str:
        """Extract phone number from resume text."""
        return self._groq_cache.get("phone", "") or ""

    def _extract_education(self, text: str) -> List[str]:
        """Extract education qualifications from resume text."""
        education = self._groq_cache.get("education", [])
        if not isinstance(education, list):
            return []
        return [str(e) for e in education if e]

    def _extract_name(self, text: str) -> str:
        """Extract candidate name from resume text."""
        return self._groq_cache.get("name", "") or ""