"""
TrustHire Resume Parser
Extracts skills and info from PDF/DOCX resumes
"""

import re
import logging
from typing import List

logger = logging.getLogger(__name__)

# Comprehensive skills database
SKILLS_DATABASE = {
    # Programming Languages
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go',
    'golang', 'rust', 'swift', 'kotlin', 'php', 'scala', 'r', 'matlab',
    'perl', 'dart', 'lua', 'haskell', 'elixir', 'clojure',
    
    # Web Frontend
    'html', 'css', 'react', 'reactjs', 'react.js', 'angular', 'angularjs',
    'vue', 'vuejs', 'vue.js', 'svelte', 'next.js', 'nextjs', 'nuxt.js',
    'gatsby', 'tailwind', 'tailwindcss', 'bootstrap', 'sass', 'scss',
    'less', 'jquery', 'webpack', 'vite', 'redux', 'mobx',
    
    # Web Backend
    'node.js', 'nodejs', 'express', 'expressjs', 'django', 'flask',
    'fastapi', 'spring', 'spring boot', 'rails', 'ruby on rails',
    'asp.net', '.net', 'laravel', 'nestjs', 'nest.js', 'koa',
    
    # Databases
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis',
    'elasticsearch', 'cassandra', 'dynamodb', 'firebase', 'supabase',
    'sqlite', 'oracle', 'mssql', 'neo4j', 'graphql', 'prisma',
    
    # Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes',
    'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions',
    'gitlab ci', 'circleci', 'nginx', 'apache', 'linux', 'bash',
    
    # Data Science & ML
    'machine learning', 'deep learning', 'tensorflow', 'pytorch',
    'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy', 'scipy',
    'matplotlib', 'seaborn', 'jupyter', 'nlp', 'natural language processing',
    'computer vision', 'opencv', 'data analysis', 'data visualization',
    'tableau', 'power bi', 'spark', 'hadoop', 'airflow',
    
    # Mobile
    'android', 'ios', 'react native', 'flutter', 'xamarin',
    'swiftui', 'jetpack compose',
    
    # Tools & Practices
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'agile', 'scrum', 'kanban', 'tdd', 'rest api', 'restful',
    'microservices', 'api design', 'system design', 'oop',
    'design patterns', 'data structures', 'algorithms',
    
    # Other
    'figma', 'photoshop', 'illustrator', 'sketch',
    'ui/ux', 'ux design', 'ui design', 'wireframing',
    'seo', 'google analytics', 'a/b testing',
    'blockchain', 'web3', 'solidity',
    'cybersecurity', 'penetration testing', 'ethical hacking',
}


class ResumeParser:
    def __init__(self):
        pass

    def parse(self, content: bytes, filename: str) -> dict:
        """Parse resume file and extract information"""
        try:
            ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''

            if ext == 'pdf':
                text = self._extract_pdf(content)
            elif ext in ('doc', 'docx'):
                text = self._extract_docx(content)
            else:
                text = content.decode('utf-8', errors='ignore')

            skills = self._extract_skills(text)
            email = self._extract_email(text)
            phone = self._extract_phone(text)
            education = self._extract_education(text)
            name = self._extract_name(text)
            cgpa = self._extract_cgpa(text)
            batch_year = self._extract_batch_year(text)
            department = self._extract_department(text)

            return {
                'skills': skills,
                'email': email,
                'phone': phone,
                'education': education,
                'name': name,
                'cgpa': cgpa,
                'batch_year': batch_year,
                'department': department,
                'text_length': len(text),
                'parsed': True
            }
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {'skills': [], 'parsed': False, 'error': str(e)}

    def _extract_cgpa(self, text: str) -> str:
        match = re.search(r'(?i)(?:cgpa|gpa|c\.g\.p\.a)[\s:-]*([0-9]\.[0-9]{1,2}|10\.0)', text)
        return match.group(1) if match else ''

    def _extract_batch_year(self, text: str) -> str:
        matches = re.findall(r'\b(20[1-3][0-9])\b', text)
        return max(matches) if matches else ''

    def _extract_department(self, text: str) -> str:
        depts = ['Computer Science', 'Information Technology', 'Software Engineering', 'Electrical', 'Mechanical', 'Civil', 'Electronics', 'Artificial Intelligence', 'Data Science', 'Business Administration']
        for dept in depts:
            if re.search(r'\b' + re.escape(dept) + r'\b', text, re.IGNORECASE):
                return dept
        return ''

    def _extract_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            from PyPDF2 import PdfReader
            import io
            reader = PdfReader(io.BytesIO(content))
            text = ''
            for page in reader.pages:
                text += page.extract_text() or ''
            return text
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ''

    def _extract_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            from docx import Document
            import io
            doc = Document(io.BytesIO(content))
            return '\n'.join([para.text for para in doc.paragraphs])
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return ''

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text"""
        text_lower = text.lower()
        found_skills = set()

        for skill in SKILLS_DATABASE:
            # Use word boundary matching for short skills
            if len(skill) <= 2:
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    found_skills.add(skill.title() if len(skill) > 2 else skill.upper())
            elif skill in text_lower:
                # Proper casing
                if skill in ('aws', 'gcp', 'sql', 'css', 'html', 'oop', 'tdd', 'nlp', 'seo'):
                    found_skills.add(skill.upper())
                elif '.' in skill or skill.startswith(('react', 'node', 'vue', 'next', 'nest')):
                    found_skills.add(skill)
                else:
                    found_skills.add(skill.title())

        return sorted(list(found_skills))

    def _extract_email(self, text: str) -> str:
        """Extract email from text"""
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
        return match.group(0) if match else ''

    def _extract_phone(self, text: str) -> str:
        """Extract phone number from text"""
        match = re.search(r'[\+]?[\d\s\-\(\)]{10,15}', text)
        return match.group(0).strip() if match else ''

    def _extract_education(self, text: str) -> List[str]:
        """Extract education details"""
        education = []
        patterns = [
            r'(?i)(b\.?tech|b\.?e\.?|bachelor)',
            r'(?i)(m\.?tech|m\.?e\.?|master|mba|m\.?s\.?)',
            r'(?i)(ph\.?d|doctorate)',
            r'(?i)(diploma|certificate)',
            r'(?i)(b\.?sc|m\.?sc|b\.?com|m\.?com|b\.?a\.?|m\.?a\.?)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text)
            education.extend(matches)
        return list(set(education))

    def _extract_name(self, text: str) -> str:
        """Extract name (heuristic: first line of resume)"""
        lines = text.strip().split('\n')
        for line in lines[:5]:
            line = line.strip()
            if line and len(line) < 50 and not re.search(r'[@\d]', line):
                # Likely a name
                words = line.split()
                if 1 <= len(words) <= 4:
                    return line
        return ''
