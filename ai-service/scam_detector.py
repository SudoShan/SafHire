"""
TrustHire Scam Detector - Multi-Layered Analysis Engine

Layer 1: Keyword-based detection (rule-based)
Layer 2: ML classifier (TF-IDF + Logistic Regression)
Layer 3: LLM reasoning (explanation generation)
"""

import os
import re
import logging
import numpy as np
from typing import List, Optional

logger = logging.getLogger(__name__)

# ==================== Layer 1: Keyword Detection ====================

SCAM_KEYWORDS = {
    # High-risk keywords (weight: 3)
    'high': [
        'guaranteed income', 'guaranteed money', 'guaranteed earnings',
        'wire transfer', 'western union', 'money order',
        'bank details', 'bank account details', 'ssn', 'social security',
        'credit card', 'pay upfront', 'registration fee', 'processing fee',
        'advance fee', 'security deposit required',
        'no experience needed', 'no skills required', 'no qualifications',
        'act now', 'limited time', 'spots filling up', 'urgent hiring',
        'too good to be true', 'secret shopper', 'mystery shopper',
        'pyramid', 'mlm', 'multi-level', 'network marketing',
        'cryptocurrency investment', 'forex trading opportunity',
        'click this link', 'personal information', 'send money',
    ],
    # Medium-risk keywords (weight: 2)
    'medium': [
        'work from home', 'earn from home', 'be your own boss',
        'unlimited earning', 'unlimited income', 'passive income',
        'quick money', 'easy money', 'fast cash',
        'no interview', 'instant hire', 'hired immediately',
        'commission only', 'commission based only',
        'not a scam', 'this is legitimate', 'trust me',
        '100% free', 'completely free', 'risk free',
        'make money online', 'earn online',
    ],
    # Low-risk keywords (weight: 1)
    'low': [
        'flexible hours', 'part time', 'extra income',
        'home based', 'remote work', 'telecommute',
        'resume not required', 'cover letter not required',
        'whatsapp', 'telegram',
    ]
}

SCAM_PATTERNS = [
    (r'\$\d{4,}\s*(per|a|/)\s*(week|day)', 3),       # Unrealistic daily/weekly pay
    (r'earn\s*\$?\d{4,}\s*(per|a|/)\s*(week|day)', 3),
    (r'\b[A-Z]{3,}\b.*\b[A-Z]{3,}\b.*!!!', 2),       # EXCESSIVE CAPS AND EXCLAMATION
    (r'!!!+', 2),                                       # Multiple exclamation marks
    (r'(?i)(click|visit|go to)\s+(this|the|our)\s+(link|url|website)', 2),
    (r'(?i)send\s+(your|us|me)\s+(money|payment|fee)', 3),
    (r'(?i)(personal|private)\s+(information|details|data)', 2),
    (r'(?i)guaranteed\s+\$?\d+', 3),                   # Guaranteed specific amount
]

# Legitimate indicators (negative weights)
LEGIT_INDICATORS = [
    'years of experience', 'degree required', 'bachelor', 'master',
    'health insurance', 'dental', '401k', 'pto', 'paid time off',
    'equal opportunity', 'background check', 'references required',
    'competitive salary', 'benefits package', 'professional development',
    'company culture', 'team building', 'mentorship',
    'interview process', 'technical assessment',
]


class ScamDetector:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self._load_ml_model()

    def _load_ml_model(self):
        """Load or train the ML model"""
        try:
            import joblib
            model_path = os.getenv('SCAM_MODEL_PATH', 'models/scam_detector.joblib')
            vectorizer_path = os.getenv('VECTORIZER_PATH', 'models/tfidf_vectorizer.joblib')

            if os.path.exists(model_path) and os.path.exists(vectorizer_path):
                self.model = joblib.load(model_path)
                self.vectorizer = joblib.load(vectorizer_path)
                logger.info("ML model loaded successfully")
            else:
                logger.info("No pre-trained model found. Training new model...")
                self._train_model()
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}. Using keyword-only detection.")

    def _train_model(self):
        """Train TF-IDF + Logistic Regression model on sample data"""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            import joblib

            # Training data (expanded sample)
            texts = [
                # Scam examples (label=1)
                "EARN $5000 PER WEEK FROM HOME!!! No experience needed! Send bank details to start!",
                "Guaranteed income of $3000 daily! Just pay $200 registration fee to begin!",
                "Work from home and make unlimited money! No skills required! Act NOW!",
                "Easy money opportunity! Wire transfer $100 to secure your spot! Limited positions!",
                "Be your own boss! Earn passive income! Join our MLM team today!",
                "Secret shopper needed! Send us your personal information and SSN to apply!",
                "Quick cash opportunity! No interview needed! Hired immediately! Commission only!",
                "Amazing job! Pay upfront processing fee of $50! Guaranteed $10000/month!",
                "Forex trading opportunity! Guaranteed returns! Invest now! Limited spots!",
                "Data entry job! Pay registration fee! Earn $5000/week! No experience!",
                "Mystery shopper position! Send bank account details! Start earning today!",
                "Work from home! Unlimited earning potential! No qualifications needed! Act now!",
                "Guaranteed income! Wire money to start! This is NOT a scam! Trust me!",
                "Earn $2000 daily from your phone! No skills required! Click this link!",
                "Home based job! Pay $150 security deposit! Guaranteed weekly payments!",
                
                # Legitimate examples (label=0)
                "Software Engineer needed with 3+ years experience in React and Node.js. Competitive salary with health insurance, 401k, and PTO. Equal opportunity employer.",
                "Data Analyst position. Requirements: Bachelor's degree in Statistics or related field. Experience with SQL, Python, and Tableau. Benefits include dental and vision.",
                "We are hiring a Product Manager. 5+ years experience in agile development. Technical assessment and multi-round interview process. Professional development budget.",
                "Junior Developer internship. Currently pursuing CS degree. Monthly stipend ₹25,000. Office location: Bangalore. Mentorship program included.",
                "Marketing Coordinator role. Bachelor's degree required. 2 years experience in digital marketing. Health insurance and paid time off provided.",
                "UX Designer position at our design studio. Portfolio required. 3+ years experience. Competitive salary, remote work options, team building events.",
                "DevOps Engineer. Experience with AWS, Docker, Kubernetes. Background check required. Benefits package includes health, dental, 401k matching.",
                "Full Stack Developer. Proficient in Python and JavaScript. 2-4 years experience. Interview process includes coding challenge and system design.",
                "Research Scientist. PhD preferred. Experience in NLP or computer vision. Competitive compensation with equity. References required.",
                "Customer Success Manager. 3+ years B2B SaaS experience. Excellent communication skills. Base salary plus bonus structure. Professional development opportunities.",
                "Frontend Developer with React expertise needed. 2+ years experience. Agile team environment. Health insurance and flexible PTO.",
                "Backend Engineer - Java/Spring Boot. 4+ years experience. Microservices architecture. Company culture focused on innovation.",
                "Technical Writer needed for API documentation. Bachelor's degree. 2 years technical writing experience. Remote-first company.",
                "QA Engineer position. Manual and automated testing. ISTQB certification preferred. Equal opportunity employer with inclusive culture.",
                "Mobile Developer (iOS/Android). Swift or Kotlin experience. Published apps preferred. Competitive salary with RSU grants.",
            ]
            
            labels = [1]*15 + [0]*15  # 1=scam, 0=legitimate

            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                stop_words='english',
                min_df=1
            )
            X = self.vectorizer.fit_transform(texts)

            self.model = LogisticRegression(
                C=1.0,
                max_iter=1000,
                class_weight='balanced'
            )
            self.model.fit(X, labels)

            # Save model
            os.makedirs('models', exist_ok=True)
            joblib.dump(self.model, 'models/scam_detector.joblib')
            joblib.dump(self.vectorizer, 'models/tfidf_vectorizer.joblib')
            logger.info("ML model trained and saved successfully")

        except Exception as e:
            logger.error(f"Model training failed: {e}")

    def _layer1_keywords(self, text: str) -> dict:
        """Layer 1: Rule-based keyword detection"""
        text_lower = text.lower()
        found_keywords = []
        score = 0
        max_possible = 0

        weights = {'high': 3, 'medium': 2, 'low': 1}

        for severity, keywords in SCAM_KEYWORDS.items():
            w = weights[severity]
            for kw in keywords:
                max_possible += w
                if kw in text_lower:
                    found_keywords.append(f"[{severity}] {kw}")
                    score += w

        # Check regex patterns
        for pattern, weight in SCAM_PATTERNS:
            max_possible += weight
            if re.search(pattern, text):
                found_keywords.append(f"[pattern] {pattern[:30]}...")
                score += weight

        # Check legitimate indicators (reduce score)
        legit_count = sum(1 for ind in LEGIT_INDICATORS if ind in text_lower)
        legit_reduction = min(legit_count * 2, score * 0.5)

        # Normalize to 0-100
        if max_possible > 0:
            raw_score = max(0, score - legit_reduction)
            normalized_score = min(100, (raw_score / max(max_possible * 0.3, 1)) * 100)
        else:
            normalized_score = 0

        return {
            'score': round(normalized_score, 2),
            'flags': found_keywords,
            'legit_indicators': legit_count
        }

    def _layer2_ml(self, text: str) -> dict:
        """Layer 2: ML classifier (TF-IDF + Logistic Regression)"""
        if not self.model or not self.vectorizer:
            return {'score': 0, 'confidence': 0, 'available': False}

        try:
            X = self.vectorizer.transform([text])
            prediction = self.model.predict(X)[0]
            probabilities = self.model.predict_proba(X)[0]

            scam_prob = probabilities[1] if len(probabilities) > 1 else probabilities[0]

            return {
                'score': round(scam_prob * 100, 2),
                'prediction': int(prediction),
                'confidence': round(max(probabilities) * 100, 2),
                'available': True
            }
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return {'score': 0, 'confidence': 0, 'available': False}

    def _layer3_llm(self, title: str, description: str) -> dict:
        """Layer 3: LLM reasoning for explanation"""
        api_key = os.getenv('OPENAI_API_KEY', '')

        if not api_key or api_key == 'your-openai-api-key':
            # Fallback: generate rule-based explanation
            return self._generate_fallback_explanation(title, description)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            prompt = f"""Analyze this job posting for potential fraud/scam indicators.

Job Title: {title}
Job Description: {description}

Provide:
1. A scam likelihood score (0-100)
2. Key risk factors identified
3. A brief explanation for the assessment

Respond in JSON format:
{{"score": <number>, "risk_factors": [<strings>], "explanation": "<string>"}}"""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a fraud detection expert analyzing job postings for scam indicators."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            import json
            content = response.choices[0].message.content
            # Try to parse JSON from response
            try:
                result = json.loads(content)
                return {
                    'score': result.get('score', 0),
                    'explanation': result.get('explanation', ''),
                    'risk_factors': result.get('risk_factors', []),
                    'available': True
                }
            except json.JSONDecodeError:
                return {
                    'score': 0,
                    'explanation': content,
                    'risk_factors': [],
                    'available': True
                }

        except Exception as e:
            logger.warning(f"LLM analysis failed: {e}")
            return self._generate_fallback_explanation(title, description)

    def _generate_fallback_explanation(self, title: str, description: str) -> dict:
        """Generate explanation without LLM"""
        text = f"{title} {description}".lower()
        concerns = []
        positives = []

        if any(kw in text for kw in ['guaranteed', 'promise', 'assured']):
            concerns.append("Contains guarantee claims that are unusual for legitimate jobs")
        if any(kw in text for kw in ['pay upfront', 'registration fee', 'processing fee', 'advance fee']):
            concerns.append("Requires upfront payment from applicants — a major red flag")
        if any(kw in text for kw in ['no experience', 'no skills', 'no qualifications']):
            concerns.append("Claims no experience/skills needed, which is unusual for well-paying positions")
        if any(kw in text for kw in ['bank details', 'ssn', 'personal information', 'credit card']):
            concerns.append("Requests sensitive personal/financial information upfront")
        if any(kw in text for kw in ['act now', 'limited time', 'urgent', 'hurry']):
            concerns.append("Uses high-pressure urgency tactics")
        if re.search(r'\$\d{4,}\s*(per|a|/)\s*(week|day)', text):
            concerns.append("Promises unrealistically high compensation for the role")
        if any(kw in text for kw in ['health insurance', '401k', 'pto', 'benefits']):
            positives.append("Mentions standard employment benefits")
        if any(kw in text for kw in ['years of experience', 'degree required', 'bachelor']):
            positives.append("Has specific qualification requirements")
        if any(kw in text for kw in ['interview', 'assessment', 'background check']):
            positives.append("Includes standard hiring process steps")

        if concerns:
            explanation = f"⚠️ Risk factors identified: {'; '.join(concerns)}."
            if positives:
                explanation += f" ✅ Positive indicators: {'; '.join(positives)}."
        elif positives:
            explanation = f"✅ This job posting appears legitimate. Positive indicators: {'; '.join(positives)}."
        else:
            explanation = "ℹ️ No strong scam indicators detected, but limited analysis possible without more data."

        return {
            'score': len(concerns) * 15,
            'explanation': explanation,
            'risk_factors': concerns,
            'available': False
        }

    def analyze(self, title: str, description: str,
                salary_min: Optional[float] = None,
                salary_max: Optional[float] = None,
                requirements: List[str] = []) -> dict:
        """Run all 3 layers and combine results"""

        full_text = f"{title} {description} {' '.join(requirements)}"

        # Layer 1: Keywords
        layer1 = self._layer1_keywords(full_text)

        # Layer 2: ML
        layer2 = self._layer2_ml(full_text)

        # Layer 3: LLM
        layer3 = self._layer3_llm(title, description)

        # Combine scores with weights
        # Layer 1: 30%, Layer 2: 40%, Layer 3: 30%
        weights = [0.30, 0.40, 0.30]
        scores = [layer1['score'], layer2['score'], layer3['score']]

        # Adjust weights if a layer is unavailable
        if not layer2.get('available', True):
            weights = [0.50, 0.0, 0.50]
        if not layer3.get('available', True) and not layer2.get('available', True):
            weights = [1.0, 0.0, 0.0]
        elif not layer3.get('available', True):
            weights = [0.40, 0.60, 0.0]

        combined_score = sum(s * w for s, w in zip(scores, weights))

        # Salary sanity check bonus
        if salary_min and salary_max:
            if salary_max > salary_min * 10:
                combined_score = min(100, combined_score + 10)
            if salary_min > 500000:  # Suspiciously high for entry-level
                combined_score = min(100, combined_score + 5)

        combined_score = round(min(100, max(0, combined_score)), 2)

        # Determine risk level
        if combined_score >= 80:
            risk_level = 'critical'
        elif combined_score >= 60:
            risk_level = 'high'
        elif combined_score >= 40:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        return {
            'scam_score': combined_score,
            'risk_level': risk_level,
            'explanation': layer3.get('explanation', 'Analysis complete.'),
            'keyword_flags': layer1['flags'],
            'layer_results': {
                'keyword_detection': layer1,
                'ml_classifier': layer2,
                'llm_reasoning': {
                    'score': layer3['score'],
                    'available': layer3.get('available', False)
                }
            }
        }
