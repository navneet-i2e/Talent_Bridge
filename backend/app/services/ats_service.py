# backend/app/services/ats_service.py  (NEW FILE)
# pip install pdfplumber  (free, no API needed)

import re
import pdfplumber
from typing import Optional
from pathlib import Path


# ── Common skill keywords for matching ───────────────────────────────────────
TECH_SKILLS = {
    "python", "javascript", "typescript", "react", "angular", "vue", "node",
    "fastapi", "django", "flask", "express", "sql", "mysql", "postgresql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp",
    "git", "html", "css", "java", "kotlin", "swift", "flutter", "dart",
    "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
    "numpy", "scikit-learn", "nlp", "graphql", "rest", "api", "linux",
    "c++", "c#", "go", "rust", "php", "ruby", "rails", "spring", "next.js",
    "tailwind", "figma", "ci/cd", "jenkins", "github actions", "terraform",
}

ATS_KEYWORDS = {
    "experience", "education", "skills", "projects", "achievements",
    "summary", "objective", "certifications", "awards", "publications",
    "volunteer", "languages", "references",
}

ACTION_VERBS = {
    "developed", "built", "designed", "implemented", "led", "managed",
    "created", "improved", "optimized", "deployed", "architected", "delivered",
    "increased", "reduced", "automated", "integrated", "mentored", "launched",
}


def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from PDF using pdfplumber."""
    try:
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(
                page.extract_text() or ""
                for page in pdf.pages
            ).strip()
    except Exception as e:
        return ""


def parse_resume(file_path: str) -> dict:
    """
    Parse resume PDF and extract structured data.
    Returns: name, email, phone, skills, sections, word_count
    """
    text = extract_text_from_pdf(file_path)
    if not text:
        return {"error": "Could not extract text from PDF"}

    text_lower = text.lower()
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Extract email
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text)
    email = email_match.group(0) if email_match else None

    # Extract phone
    phone_match = re.search(r'[\+]?[\d\s\-\(\)]{10,15}', text)
    phone = phone_match.group(0).strip() if phone_match else None

    # Detect name (first non-empty line, usually)
    name = lines[0] if lines else None

    # Find skills mentioned
    found_skills = [s for s in TECH_SKILLS if s in text_lower]

    # Detect sections present
    found_sections = [s for s in ATS_KEYWORDS if s in text_lower]

    # Count action verbs (shows impact-driven writing)
    found_verbs = [v for v in ACTION_VERBS if v in text_lower]

    # Detect bullet points (good for ATS)
    bullet_lines = [l for l in lines if l.startswith(("•", "-", "*", "→", "▪"))]

    return {
        "name":          name,
        "email":         email,
        "phone":         phone,
        "skills_found":  found_skills,
        "sections":      found_sections,
        "action_verbs":  found_verbs,
        "bullet_count":  len(bullet_lines),
        "word_count":    len(text.split()),
        "page_count":    _get_page_count(file_path),
        "raw_text":      text[:3000],  # first 3000 chars for AI analysis
    }


def _get_page_count(file_path: str) -> int:
    try:
        with pdfplumber.open(file_path) as pdf:
            return len(pdf.pages)
    except:
        return 0


def score_resume_against_job(resume_data: dict, job_title: str, job_description: str, required_skills: list) -> dict:
    """
    ATS scoring: compare resume against job requirements.
    Returns score 0-100 + detailed breakdown.
    """
    score = 0
    feedback = []
    improvements = []

    text_lower = (resume_data.get("raw_text", "") + " " + " ".join(resume_data.get("skills_found", []))).lower()
    jd_lower = job_description.lower()

    # ── 1. Skills match (40 points) ─────────────────────────────────────────
    required = [s.lower() for s in required_skills]
    matched_skills = [s for s in required if s in text_lower]
    skill_score = int((len(matched_skills) / max(len(required), 1)) * 40)
    score += skill_score

    missing_skills = [s for s in required if s not in text_lower]
    if missing_skills:
        improvements.append(f"Add missing skills: {', '.join(missing_skills[:5])}")
    if matched_skills:
        feedback.append(f"✅ Matched {len(matched_skills)}/{len(required)} required skills")

    # ── 2. Keywords from JD (20 points) ─────────────────────────────────────
    jd_words = set(re.findall(r'\b\w{4,}\b', jd_lower)) - {"with", "that", "this", "have", "from", "will", "your"}
    matched_kw = [w for w in jd_words if w in text_lower]
    kw_score = min(20, int(len(matched_kw) / max(len(jd_words), 1) * 40))
    score += kw_score
    feedback.append(f"✅ {len(matched_kw)} job description keywords matched")

    # ── 3. Resume structure (20 points) ─────────────────────────────────────
    sections = resume_data.get("sections", [])
    critical = ["experience", "education", "skills"]
    present = [s for s in critical if s in sections]
    struct_score = int((len(present) / 3) * 20)
    score += struct_score
    missing_sections = [s for s in critical if s not in sections]
    if missing_sections:
        improvements.append(f"Add missing sections: {', '.join(missing_sections)}")

    # ── 4. Action verbs (10 points) ─────────────────────────────────────────
    verbs = resume_data.get("action_verbs", [])
    verb_score = min(10, len(verbs) * 2)
    score += verb_score
    if len(verbs) < 3:
        improvements.append("Use more action verbs: developed, led, increased, reduced, etc.")
    else:
        feedback.append(f"✅ Good use of {len(verbs)} action verbs")

    # ── 5. Length check (10 points) ─────────────────────────────────────────
    word_count = resume_data.get("word_count", 0)
    pages = resume_data.get("page_count", 1)
    if 300 <= word_count <= 800 and pages <= 2:
        score += 10
        feedback.append("✅ Good resume length")
    elif word_count < 200:
        improvements.append("Resume is too short — add more detail about your experience")
    elif word_count > 1000:
        improvements.append("Resume is too long — keep it to 1-2 pages")

    # ── Determine grade ──────────────────────────────────────────────────────
    if score >= 80:   grade = "Excellent"
    elif score >= 60: grade = "Good"
    elif score >= 40: grade = "Average"
    else:             grade = "Needs Work"

    return {
        "score":          min(score, 100),
        "grade":          grade,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "feedback":       feedback,
        "improvements":   improvements,
        "breakdown": {
            "skills_match":     skill_score,
            "keyword_match":    kw_score,
            "structure":        struct_score,
            "action_verbs":     verb_score,
        }
    }