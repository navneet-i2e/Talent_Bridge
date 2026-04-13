// frontend/src/lib/aiInline.js  (NEW FILE)
// Direct Groq API calls for inline AI features
// No chatbot redirect — AI runs in the component itself

import api from './api'

/**
 * Generate cover letter inline — used in apply modal
 * Returns streamed text via callback
 */
export async function generateCoverLetter({ jobTitle, company, jobDescription, seekerProfile }, onChunk, onDone) {
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        // Use a special session or create one
        session_id: null,  // handled below
        message: `Write a professional cover letter for this job:
        
Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription?.slice(0, 500) || 'Not provided'}

My Profile:
- Name: ${seekerProfile?.full_name || 'Not provided'}
- Headline: ${seekerProfile?.headline || 'Not provided'}
- Experience: ${seekerProfile?.experience_years || 0} years
- Skills: ${seekerProfile?.skills?.map(s => s.name).join(', ') || 'Not provided'}

Write a concise, impactful cover letter (3 paragraphs). Be specific and professional.`,
      }),
    })
    // ... stream handling
  } catch (err) {
    onDone(null, err.message)
  }
}

/**
 * Better approach: dedicated backend endpoint for inline AI
 * This avoids needing a chat session for simple one-off AI calls
 */
export const inlineAI = {
  // Generate cover letter for a specific job
  coverLetter: (data) => api.post('/ai/cover-letter', data),
  
  // Quick ATS score (returns JSON, not stream)
  atsScore: (jobId, resumeText) => api.post('/ai/ats-score', { job_id: jobId, resume_text: resumeText }),
  
  // Job description generator for employers
  generateJD: (data) => api.post('/ai/generate-jd', data),
  
  // Interview questions for a role
  interviewQuestions: (role, level) => api.post('/ai/interview-questions', { role, level }),
}