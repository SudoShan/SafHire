"""
TrustHire Interview Preparation Generator
Generates preparation topics, interview questions, and discussion summaries
"""

import os
import logging
from typing import List

logger = logging.getLogger(__name__)


# Comprehensive topic and question database by domain
PREP_DATABASE = {
    'software': {
        'topics': [
            'Data Structures & Algorithms',
            'System Design & Architecture',
            'Object-Oriented Programming Principles',
            'Design Patterns (Singleton, Observer, Factory)',
            'Database Design & Optimization',
            'RESTful API Design',
            'Version Control with Git',
            'Testing (Unit, Integration, E2E)',
            'CI/CD Pipelines',
            'Agile/Scrum Methodology'
        ],
        'questions': [
            'Explain the difference between a stack and a queue. When would you use each?',
            'How would you design a URL shortening service like bit.ly?',
            'What are SOLID principles? Give an example of each.',
            'Explain the differences between SQL and NoSQL databases.',
            'How do you handle race conditions in a concurrent environment?',
            'Describe the lifecycle of a typical HTTP request.',
            'What is your experience with microservices architecture?',
            'How would you optimize a slow database query?',
            'Explain the concept of "eventual consistency".',
            'Walk me through how you would debug a production issue.'
        ]
    },
    'frontend': {
        'topics': [
            'HTML5 Semantic Elements & Accessibility',
            'CSS Flexbox & Grid Layouts',
            'JavaScript ES6+ Features',
            'React Component Lifecycle & Hooks',
            'State Management (Redux, Context API)',
            'Browser Rendering Pipeline',
            'Web Performance Optimization',
            'Responsive Design Patterns',
            'Frontend Testing (Jest, Cypress)',
            'Cross-Browser Compatibility'
        ],
        'questions': [
            'Explain the virtual DOM and how React uses it.',
            'What is the difference between useEffect and useLayoutEffect?',
            'How would you optimize a large list rendering in React?',
            'Explain CSS specificity and the cascade.',
            'What are Web Vitals and how do you improve them?',
            'How does event delegation work in JavaScript?',
            'Explain the difference between SSR, SSG, and CSR.',
            'How would you implement infinite scrolling?',
            'What is CORS and how do you handle it?',
            'Describe your approach to making a website accessible.'
        ]
    },
    'backend': {
        'topics': [
            'Server Architecture & Scaling',
            'Database Design & Normalization',
            'Authentication & Authorization',
            'Caching Strategies',
            'Message Queues & Event-Driven Architecture',
            'API Security Best Practices',
            'Containerization with Docker',
            'Load Balancing & Reverse Proxying',
            'Logging & Monitoring',
            'Error Handling & Resilience Patterns'
        ],
        'questions': [
            'How would you design an API rate limiter?',
            'Explain the CAP theorem and its implications.',
            'How do you handle database migrations safely?',
            'What is the N+1 query problem and how do you solve it?',
            'Describe your approach to API versioning.',
            'How would you implement a job queue system?',
            'Explain the difference between horizontal and vertical scaling.',
            'How do you handle secrets management in production?',
            'What security measures do you implement for REST APIs?',
            'How would you design a notification system?'
        ]
    },
    'data_science': {
        'topics': [
            'Statistics & Probability Fundamentals',
            'Machine Learning Algorithms',
            'Feature Engineering',
            'Deep Learning & Neural Networks',
            'Natural Language Processing',
            'Model Evaluation Metrics',
            'Data Preprocessing & Cleaning',
            'A/B Testing & Experimentation',
            'Big Data Tools (Spark, Hadoop)',
            'ML Model Deployment & MLOps'
        ],
        'questions': [
            'Explain the bias-variance tradeoff.',
            'What is regularization and when do you use it?',
            'How do you handle imbalanced datasets?',
            'Explain the difference between bagging and boosting.',
            'What is cross-validation and why is it important?',
            'How would you approach a new classification problem?',
            'Explain precision, recall, and F1-score.',
            'What is gradient descent and how does it work?',
            'How do you handle missing data in a dataset?',
            'Describe a machine learning project you worked on end-to-end.'
        ]
    },
    'product': {
        'topics': [
            'Product Strategy & Vision',
            'User Research Methods',
            'Market Analysis & Competitive Intelligence',
            'Agile Product Development',
            'Metrics & Analytics (KPIs, OKRs)',
            'Roadmap Planning & Prioritization',
            'Stakeholder Management',
            'Go-to-Market Strategy',
            'User Story Writing',
            'A/B Testing & Feature Flags'
        ],
        'questions': [
            'How do you prioritize features on a product roadmap?',
            'Describe a product you improved and the impact it had.',
            'How do you handle conflicting priorities from stakeholders?',
            'What metrics would you track for a social media app?',
            'How do you validate a product idea before building it?',
            'Walk me through your process for writing a PRD.',
            'How do you make decisions when you have limited data?',
            'Describe a product launch you managed.',
            'How do you gather and incorporate user feedback?',
            'What frameworks do you use for product decisions?'
        ]
    },
    'general': {
        'topics': [
            'Communication & Presentation Skills',
            'Problem Solving & Critical Thinking',
            'Team Collaboration',
            'Time Management & Prioritization',
            'Leadership & Initiative',
            'Adaptability & Learning Agility',
            'Conflict Resolution',
            'Industry Awareness',
            'Networking & Professional Development',
            'Work Ethics & Professional Behavior'
        ],
        'questions': [
            'Tell me about yourself and your career goals.',
            'What is your greatest professional achievement?',
            'Describe a situation where you handled a difficult team member.',
            'How do you manage competing priorities?',
            'Tell me about a time you failed and what you learned.',
            'Why are you interested in this role/company?',
            'What do you consider your biggest weakness?',
            'Where do you see yourself in 5 years?',
            'How do you stay updated with industry trends?',
            'Describe your ideal work environment.'
        ]
    }
}

# Skill-specific question templates
SKILL_QUESTIONS = {
    'react': [
        'Explain the useState and useReducer hooks.',
        'How do you optimize re-renders in React?',
        'What is the React Fiber architecture?'
    ],
    'python': [
        'Explain decorators in Python.',
        'What are generators and when would you use them?',
        'How does Python handle memory management?'
    ],
    'node.js': [
        'Explain the event loop in Node.js.',
        'How do you handle errors in async/await?',
        'What are streams in Node.js and when would you use them?'
    ],
    'sql': [
        'Explain different types of JOINs with examples.',
        'How do database indexes work?',
        'What is the difference between HAVING and WHERE?'
    ],
    'docker': [
        'What is the difference between a Docker image and container?',
        'How do you optimize Docker image size?',
        'Explain Docker networking modes.'
    ],
    'aws': [
        'Explain the AWS shared responsibility model.',
        'How would you design a highly available architecture on AWS?',
        'What is the difference between SQS and SNS?'
    ]
}


class InterviewPrepGenerator:
    def __init__(self):
        self.openai_key = os.getenv('OPENAI_API_KEY', '')

    def generate(self, job_title: str, job_description: str = '',
                 required_skills: List[str] = [], student_skills: List[str] = None) -> dict:
        """Generate interview preparation materials"""
        student_skills = student_skills or []
        
        # Try LLM-based generation first
        if self.openai_key and self.openai_key != 'your-openai-api-key':
            try:
                return self._generate_with_llm(job_title, job_description, required_skills, student_skills)
            except Exception as e:
                logger.warning(f"LLM generation failed: {e}")

        # Fallback to rule-based generation
        return self._generate_rule_based(job_title, job_description, required_skills, student_skills)

    def _generate_with_llm(self, job_title: str, job_description: str,
                           required_skills: List[str], student_skills: List[str]) -> dict:
        """Generate with LLM"""
        from openai import OpenAI
        client = OpenAI(api_key=self.openai_key)

        prompt = f"""Generate interview preparation materials for this job:

Job Title: {job_title}
Description: {job_description}
Required Skills: {', '.join(required_skills)}
Student Skills: {', '.join(student_skills)}

Provide:
1. 5-7 roadmap steps
2. 8-10 important topics
3. 8-10 likely interview questions
4. 4-5 resume tips
5. a skill gap analysis with matched and missing skills

Format as JSON:
{{"roadmap": ["step1", "step2"], "important_topics": ["topic1", "topic2"], "likely_questions": ["q1", "q2"], "resume_tips": ["tip1"], "skill_gap_analysis": {{"matched_skills": ["React"], "missing_skills": ["Docker"], "summary": "..."}}}}"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a career coach helping candidates prepare for job interviews."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        import json
        content = response.choices[0].message.content
        try:
            result = json.loads(content)
            result['generated_by'] = 'llm'
            return result
        except json.JSONDecodeError:
            return {
                'roadmap': ['Review the full job brief and identify the core evaluation themes.'],
                'important_topics': [content],
                'likely_questions': [],
                'resume_tips': [],
                'skill_gap_analysis': {
                    'matched_skills': student_skills,
                    'missing_skills': [skill for skill in required_skills if skill not in student_skills],
                    'summary': 'Generated from raw LLM output.',
                },
                'generated_by': 'llm_raw',
            }

    def _generate_rule_based(self, job_title: str, job_description: str,
                             required_skills: List[str], student_skills: List[str]) -> dict:
        """Rule-based preparation generation"""
        title_lower = job_title.lower()
        
        # Determine domain
        domain = 'general'
        domain_keywords = {
            'software': ['software', 'engineer', 'developer', 'programmer', 'sde', 'full stack', 'fullstack'],
            'frontend': ['frontend', 'front-end', 'front end', 'ui', 'react', 'angular', 'vue'],
            'backend': ['backend', 'back-end', 'back end', 'server', 'api', 'microservice'],
            'data_science': ['data', 'machine learning', 'ml', 'ai', 'analytics', 'scientist'],
            'product': ['product', 'manager', 'pm', 'program manager']
        }

        for d, keywords in domain_keywords.items():
            if any(kw in title_lower for kw in keywords):
                domain = d
                break

        # Get base topics and questions
        prep = PREP_DATABASE.get(domain, PREP_DATABASE['general'])
        topics = list(prep['topics'])
        questions = list(prep['questions'])

        # Add skill-specific questions
        for skill in required_skills:
            skill_lower = skill.lower()
            if skill_lower in SKILL_QUESTIONS:
                questions.extend(SKILL_QUESTIONS[skill_lower])
            # Add skill-specific topic
            topics.append(f'{skill} - Best Practices & Advanced Concepts')

        # Add general questions
        if domain != 'general':
            general = PREP_DATABASE['general']
            questions.extend(general['questions'][:5])

        # Deduplicate
        topics = list(dict.fromkeys(topics))[:12]
        questions = list(dict.fromkeys(questions))[:15]

        student_skills_lower = {skill.lower() for skill in student_skills}
        matched_skills = [skill for skill in required_skills if skill.lower() in student_skills_lower]
        missing_skills = [skill for skill in required_skills if skill.lower() not in student_skills_lower]

        roadmap = [
            f'Review the {domain.replace("_", " ")} fundamentals that map to the role.',
            'Practice recent project walkthroughs with concise impact-focused storytelling.',
            'Solve 2-3 mock interview prompts under time pressure.',
            'Refine resume bullets so they highlight measurable outcomes and role-fit evidence.',
            'Prepare thoughtful questions about the team, stack, and hiring expectations.',
        ]

        resume_tips = [
            'Move your strongest role-relevant projects into the top third of the resume.',
            'Quantify outcomes with metrics, scale, latency, revenue, or user impact where possible.',
            'Mirror the job language for core skills without stuffing keywords.',
            'Keep recent, trusted technologies visible and remove stale low-signal tools.',
            'Add one resume bullet that proves collaboration, ownership, or problem-solving.',
        ]

        gap_summary = (
            'You already match a meaningful portion of the target stack.'
            if len(matched_skills) >= len(missing_skills)
            else 'This role has a few important gaps, so focus prep on the missing skills first.'
        )

        return {
            'roadmap': roadmap,
            'important_topics': topics,
            'likely_questions': questions,
            'resume_tips': resume_tips,
            'skill_gap_analysis': {
                'matched_skills': matched_skills,
                'missing_skills': missing_skills,
                'summary': gap_summary,
            },
            'domain': domain,
            'generated_by': 'rule_based'
        }

    def summarize_discussion(self, messages: str) -> dict:
        """Summarize a discussion thread"""
        if self.openai_key and self.openai_key != 'your-openai-api-key':
            try:
                return self._summarize_with_llm(messages)
            except Exception as e:
                logger.warning(f"LLM summarization failed: {e}")

        return self._summarize_rule_based(messages)

    def _summarize_with_llm(self, messages: str) -> dict:
        """Summarize with LLM"""
        from openai import OpenAI
        client = OpenAI(api_key=self.openai_key)

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Summarize this job discussion thread concisely. Return JSON with summary, common_questions, interview_difficulty, and preparation_topics."},
                {"role": "user", "content": messages}
            ],
            temperature=0.5,
            max_tokens=500
        )
        import json

        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                'summary': content,
                'common_questions': [],
                'interview_difficulty': 'medium',
                'preparation_topics': [],
            }

    def _summarize_rule_based(self, messages: str) -> dict:
        """Basic rule-based summarization"""
        lines = messages.strip().split('\n')
        total = len(lines)
        
        # Count unique participants
        participants = set()
        for line in lines:
            if ':' in line:
                name = line.split(':')[0].strip()
                if name:
                    participants.add(name)

        # Extract key topics (most frequent non-stop words)
        stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
                      'in', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'it',
                      'i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'our',
                      'not', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had',
                      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
                      'can', 'so', 'if', 'from', 'about', 'very', 'just', 'how', 'what'}

        word_count = {}
        for line in lines:
            words = line.lower().split()
            for word in words:
                word = word.strip('.,!?()[]{}":;')
                if word and len(word) > 3 and word not in stop_words:
                    word_count[word] = word_count.get(word, 0) + 1

        top_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:5]
        key_topics = [w[0] for w in top_words]

        summary = f"Discussion with {len(participants)} participants across {total} messages. "
        if key_topics:
            summary += f"Key topics discussed: {', '.join(key_topics)}. "
        summary += "Please refer to the full thread for detailed insights."

        common_questions = []
        for line in lines:
            cleaned = line.strip()
            if '?' in cleaned:
                common_questions.append(cleaned.split(':', 1)[-1].strip())

        interview_difficulty = 'medium'
        lowered = messages.lower()
        if any(word in lowered for word in ['hard', 'difficult', 'tough', 'challenging']):
            interview_difficulty = 'high'
        elif any(word in lowered for word in ['easy', 'simple', 'straightforward']):
            interview_difficulty = 'low'

        return {
            'summary': summary,
            'common_questions': list(dict.fromkeys(common_questions))[:5],
            'interview_difficulty': interview_difficulty,
            'preparation_topics': key_topics,
        }
