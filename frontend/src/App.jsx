import { useState, useEffect, useMemo } from 'react'
import './App.css'

const API_URL = '/api'

const POPULAR_SKILLS = [
  'Python', 'Java', 'C', 'C++', 'JavaScript', 'HTML', 'CSS', 'SQL', 'React',
  'Node.js', 'Machine Learning', 'Artificial Intelligence', 'Data Science',
  'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks',
  'Git/GitHub', 'Flask', 'Django', 'Cloud Computing', 'AWS', 'Azure', 'Cybersecurity',
  'DevOps', 'Power BI', 'Blockchain', 'Communication Skills', 'Problem Solving'
]

const TARGET_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Python Developer',
  'Java Developer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Data Science Intern',
  'Cloud & DevOps Engineer',
  'Cybersecurity Analyst',
  'Mobile App Developer'
]

const VERIFIED_PLATFORMS = [
  { name: 'LinkedIn Jobs', icon: '🔗', desc: 'Direct corporate postings & verified company recruiters' },
  { name: 'Indeed', icon: '💼', desc: 'Verified tech, engineering, and remote positions' },
  { name: 'Internshala', icon: '🎓', desc: 'Official fresher hiring & paid graduate internships' },
  { name: 'Naukri', icon: '🏢', desc: 'Enterprise IT, service & product companies' },
  { name: 'Wellfound (AngelList)', icon: '🚀', desc: 'High-growth startups & VC-backed companies' },
  { name: 'Official Career Portals', icon: '⭐', desc: 'Amazon, Microsoft, Google, TCS, Infosys careers' }
]

// =====================================================
// API HELPER
// =====================================================

async function api(path, options = {}, token = '') {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  let data = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || `Server returned status ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed with status ${response.status}`)
  }

  return data
}

// =====================================================
// MAIN APP COMPONENT
// =====================================================

export default function App() {
  // Navigation & Session
  const [page, setPage] = useState(() => localStorage.getItem('verixa_page') || 'home')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('verixa_token') || '')
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [globalMessage, setGlobalMessage] = useState('')

  // Auth Inputs
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [authLoading, setAuthLoading] = useState(false)

  // Verification & Profile Data
  const [assessmentHistory, setAssessmentHistory] = useState([])
  const [skillsProfile, setSkillsProfile] = useState([])
  const [resumeData, setResumeData] = useState(null)
  const [resumeList, setResumeList] = useState([])
  const [deletingResumeId, setDeletingResumeId] = useState(null)
  const [viewResumeModal, setViewResumeModal] = useState(null)
  const [certificatesList, setCertificatesList] = useState([])
  const [deletingCertId, setDeletingCertId] = useState(null)
  const [docStatus, setDocStatus] = useState(null)
  const [careerScore, setCareerScore] = useState(null)
  const [jobRecommendations, setJobRecommendations] = useState(null)
  const [skillMatrixData, setSkillMatrixData] = useState(null)

  // Projects State
  const [userProjects, setUserProjects] = useState([])
  const [availableProjectSkills, setAvailableProjectSkills] = useState([])
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    technologies_used: '',
    skills_used: [],
    status: 'Completed',
    github_link: '',
    demo_link: '',
    editingId: null
  })
  const [projectSaving, setProjectSaving] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)

  // Assessment & Multi-Round 60-Min System State
  // Round 1: Aptitude (10 Qs, 10 min / 600s, warning at 5 min / 300s)
  // Round 2: Technical Skills (10 Qs, 10 min / 600s, warning at 5 min / 300s)
  // Round 3: Verbal Ability (10 Qs, 10 min / 600s, warning at 5 min / 300s)
  // Round 4: Coding (2 Qs, 30 min / 1800s, warning at 5 min / 300s)
  // Total Assessment Time: 60 minutes.
  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [selectedAssessmentSkills, setSelectedAssessmentSkills] = useState([])
  const [diagnosticResult, setDiagnosticResult] = useState(null)
  const [diagnosticQuestions, setDiagnosticQuestions] = useState([])
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({})
  const [diagnosticSubmitting, setDiagnosticSubmitting] = useState(false)
  const [activeDiagIdx, setActiveDiagIdx] = useState(0)
  const [diagActive, setDiagActive] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [activeAssessmentCert, setActiveAssessmentCert] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600) // timer for current round

  // 4-Round Assessment System State
  const [assessmentActive, setAssessmentActive] = useState(false)
  const [assessmentRounds, setAssessmentRounds] = useState([])
  const [activeRoundIdx, setActiveRoundIdx] = useState(0)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [roundAnswers, setRoundAnswers] = useState({}) // { [roundId]: { [qid]: optIdx } }
  const [codingSolutions, setCodingSolutions] = useState({}) // { [cid]: { code: string, language: string } }
  const [roundTimeLeft, setRoundTimeLeft] = useState(600) // current round seconds remaining
  const [warnedRounds, setWarnedRounds] = useState({}) // { [roundIdx]: boolean }
  const [timeWarningPopup, setTimeWarningPopup] = useState({ show: false, title: '', message: '', roundName: '' })
  const [autoSubmitToast, setAutoSubmitToast] = useState('')
  const [codingRunResult, setCodingRunResult] = useState(null)
  const [isRunningCode, setIsRunningCode] = useState(false)

  // Legacy Single-Skill Assessment State
  const [assessmentSkill, setAssessmentSkill] = useState('')
  const [assessmentLoading, setAssessmentLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState(null)

  // Jobs Filters & State
  const [activeJobTab, setActiveJobTab] = useState('all') // 'all' | 'recommended' | 'internships' | 'saved'
  const [jobSearchQuery, setJobSearchQuery] = useState('')
  const [jobWorkModeFilter, setJobWorkModeFilter] = useState('All')
  const [jobExpFilter, setJobExpFilter] = useState('All')

  // File Upload State
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [certFile, setCertFile] = useState(null)
  const [certIssuer, setCertIssuer] = useState('')
  const [certYear, setCertYear] = useState('')
  const [certUploading, setCertUploading] = useState(false)

  // Redirect Modal State
  const [redirectNotice, setRedirectNotice] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync current page with localStorage
  const navigateTo = (p) => {
    setPage(p)
    localStorage.setItem('verixa_page', p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Timer countdown, 5-minute warning pop-up (right-side) & 00:00 auto-submit for every round
  useEffect(() => {
    let timerId = null
    if (assessmentActive && roundTimeLeft > 0) {
      timerId = setInterval(() => {
        setRoundTimeLeft(prev => {
          const nextTime = prev - 1

          // ⚠️ Warning triggered ONLY ONCE when timer reaches 5:00 (300 seconds) for each round
          if (nextTime === 300 && !warnedRounds[activeRoundIdx]) {
            setWarnedRounds(w => ({ ...w, [activeRoundIdx]: true }))
            const currentRoundObj = assessmentRounds[activeRoundIdx]
            setTimeWarningPopup({
              show: true,
              roundName: currentRoundObj?.name || `Round ${activeRoundIdx + 1}`,
              title: '⚠️ Test Ending Soon',
              message: 'Only 5 minutes remaining. Please complete and submit your answers.'
            })
          }

          // When timer reaches 00:00: Automatically submit current round & move to next round
          if (nextTime <= 0) {
            clearInterval(timerId)
            handleAutoAdvanceRound()
            return 0
          }

          return nextTime
        })
      }, 1000)
    }
    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [assessmentActive, roundTimeLeft, activeRoundIdx, warnedRounds, assessmentRounds])

  // Automatically dismiss the 5-minute warning pop-up after a few seconds
  useEffect(() => {
    if (timeWarningPopup.show) {
      const autoCloseTimer = setTimeout(() => {
        setTimeWarningPopup(prev => ({ ...prev, show: false }))
      }, 6000) // auto-dismiss after 6 seconds
      return () => clearTimeout(autoCloseTimer)
    }
  }, [timeWarningPopup.show])

  // Legacy diagnostic timer fallback
  useEffect(() => {
    let timerId = null
    if (diagActive && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerId)
            handleAutoSubmitDiagnostic()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [diagActive, timeLeft])

  const formatTimer = (seconds) => {
    const mins = Math.floor(Math.max(0, seconds) / 60)
    const secs = Math.max(0, seconds) % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // =====================================================
  // INITIAL SESSION RESTORE & DATA REFRESH ON RELOAD
  // =====================================================

  useEffect(() => {
    let isMounted = true

    async function initSession() {
      const savedToken = localStorage.getItem('verixa_token')
      if (!savedToken) {
        if (isMounted) setLoadingInitial(false)
        return
      }

      try {
        const me = await api('/me', {}, savedToken)
        if (isMounted && me) {
          const validatedUser = {
            ...me,
            name: me.name || me.email?.split('@')[0] || 'User'
          }
          setUser(validatedUser)
          setToken(savedToken)
          if (validatedUser.id) {
            await loadAllUserData(validatedUser.id, savedToken)
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err)
        localStorage.removeItem('verixa_token')
        localStorage.removeItem('verixa_page')
        if (isMounted) {
          setUser(null)
          setToken('')
          setPage('home')
        }
      } finally {
        if (isMounted) setLoadingInitial(false)
      }
    }

    initSession()
    return () => { isMounted = false }
  }, [])

  // Auto-refresh data on navigation and page change without manual browser reload
  useEffect(() => {
    if (user?.id && token && page !== 'home' && page !== 'auth') {
      loadAllUserData(user.id, token)
    }
  }, [page, user?.id, token])

  // Load all user verification data
  async function loadAllUserData(userId, currentToken = token) {
    if (!userId || !currentToken) return
    setIsRefreshing(true)

    try {
      // 1. Skill Assessment History & Profile
      const histData = await api(`/assessment/history/${userId}`, {}, currentToken)
      setAssessmentHistory(histData.history || [])
      setSkillsProfile(histData.skills_profile || [])
    } catch (e) {
      console.warn('History load error:', e.message)
    }

    try {
      // 2. Latest Diagnostic Assessment Result
      const diagData = await api(`/assessment/diagnostic/latest/${userId}`, {}, currentToken)
      if (diagData && diagData.has_taken) {
        setDiagnosticResult(diagData)
        if (diagData.target_role) setTargetRole(diagData.target_role)
      }
    } catch (e) {
      console.warn('Diagnostic load error:', e.message)
    }

    try {
      // 3. Document Status & Detailed Resume / Certs
      const statusData = await api(`/documents/status/${userId}`, {}, currentToken)
      setDocStatus(statusData)

      let rList = []
      try {
        const resumesRes = await api(`/resume/list?user_id=${userId}`, {}, currentToken)
        rList = Array.isArray(resumesRes) ? resumesRes : (resumesRes?.resumes || [])
      } catch (err) {
        console.warn('Resume list load error:', err)
      }
      setResumeList(rList)

      const resumeDetail = await api(`/documents/resume-analysis/${userId}`, {}, currentToken)
      if (resumeDetail && resumeDetail.uploaded) {
        setResumeData(resumeDetail)
        if (resumeDetail.skills && Array.isArray(resumeDetail.skills) && selectedAssessmentSkills.length === 0) {
          setSelectedAssessmentSkills(resumeDetail.skills.slice(0, 4))
        }
      } else if (rList.length > 0) {
        setResumeData(rList[0])
      } else {
        setResumeData(null)
      }

      const certsDetail = await api(`/documents/certificates/${userId}`, {}, currentToken)
      setCertificatesList(certsDetail.certificates || [])
    } catch (e) {
      console.warn('Document status load error:', e.message)
    }

    try {
      // 4. User Projects & Available Restricted Skills
      const projData = await api(`/projects/${userId}`, {}, currentToken)
      setUserProjects(projData.projects || [])

      const availData = await api(`/projects/available-skills/${userId}`, {}, currentToken)
      setAvailableProjectSkills(availData.available_skills || [])
    } catch (e) {
      console.warn('Projects load error:', e.message)
    }

    try {
      // 5. Skill Matrix & Gap Analysis
      const matrixData = await api(`/assessment/skill-profile/${userId}?target_role=${encodeURIComponent(targetRole || 'Frontend Developer')}`, {}, currentToken)
      setSkillMatrixData(matrixData)
    } catch (e) {
      console.warn('Skill matrix load error:', e.message)
    }

    try {
      // 6. Career Readiness Score (70/10/10/10)
      const scoreData = await api(`/score/career-readiness/${userId}`, {}, currentToken)
      setCareerScore(scoreData)
    } catch (e) {
      console.warn('Career score load error:', e.message)
    }

    try {
      // 7. Job Recommendations
      const jobsData = await api(`/jobs/recommendations/${userId}`, {}, currentToken)
      setJobRecommendations(jobsData)
    } catch (e) {
      console.warn('Jobs load error:', e.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // =====================================================
  // AUTH HANDLERS
  // =====================================================

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthLoading(true)
    setGlobalMessage('')

    try {
      if (authMode === 'register') {
        const regRes = await api('/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, role }),
        })
        const loginRes = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        const receivedToken = loginRes.access_token || ''
        localStorage.setItem('verixa_token', receivedToken)
        setToken(receivedToken)

        const loggedUser = loginRes.user || regRes.user || {
          id: loginRes.id || regRes.id || 1,
          name: name || email.split('@')[0],
          email,
          role
        }
        setUser(loggedUser)
        setGlobalMessage(`Account created successfully! Welcome, ${loggedUser.name || 'User'}.`)
        if (loggedUser.id) {
          await loadAllUserData(loggedUser.id, receivedToken)
        }
        navigateTo('dashboard')
      } else {
        const loginRes = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        const receivedToken = loginRes.access_token || ''
        localStorage.setItem('verixa_token', receivedToken)
        setToken(receivedToken)

        let loggedUser = loginRes.user
        if (!loggedUser && receivedToken) {
          try {
            loggedUser = await api('/me', {}, receivedToken)
          } catch (e) {
            console.warn('Could not fetch user from /me', e)
          }
        }
        if (!loggedUser) {
          loggedUser = {
            id: loginRes.id || 1,
            name: email.split('@')[0],
            email,
            role: 'student'
          }
        }
        setUser(loggedUser)
        setGlobalMessage(`Welcome back, ${loggedUser.name || 'User'}!`)
        if (loggedUser.id) {
          await loadAllUserData(loggedUser.id, receivedToken)
        }
        navigateTo('dashboard')
      }
    } catch (err) {
      setGlobalMessage(err.message || 'Unable to sign in. Please check your credentials.')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('verixa_token')
    localStorage.removeItem('verixa_page')
    setUser(null)
    setToken('')
    setPage('home')
    setAssessmentHistory([])
    setSkillsProfile([])
    setResumeData(null)
    setResumeList([])
    setViewResumeModal(null)
    setCertificatesList([])
    setDocStatus(null)
    setCareerScore(null)
    setJobRecommendations(null)
    setQuizResult(null)
    setQuizQuestions([])
    setGlobalMessage('You have been logged out safely.')
  }

  // =====================================================
  // 60-MINUTE 4-ROUND ASSESSMENT HANDLERS
  // Round 1: Aptitude (10 Qs, 10 min, 5 min warning)
  // Round 2: Technical Skills (10 Qs, 10 min, 5 min warning)
  // Round 3: Verbal Ability (10 Qs, 10 min, 5 min warning)
  // Round 4: Coding (2 Qs, 30 min, 5 min warning)
  // =====================================================

  async function handleStartMultiRoundAssessment(chosenSkill = '') {
    if (!user) {
      setGlobalMessage('Please sign in to begin your 60-minute career assessment.')
      setAuthMode('register')
      navigateTo('auth')
      return
    }

    setAssessmentLoading(true)
    setGlobalMessage('')
    setRoundAnswers({})
    setCodingSolutions({})
    setActiveRoundIdx(0)
    setActiveQuestionIdx(0)
    setWarnedRounds({})
    setTimeWarningPopup({ show: false, title: '', message: '', roundName: '' })
    setCodingRunResult(null)

    try {
      const activeSkill = (chosenSkill || assessmentSkill || (selectedAssessmentSkills.length > 0 ? selectedAssessmentSkills[0] : (resumeData?.skills?.[0] || 'Python'))).trim()
      const skillsToTest = [activeSkill]

      const payload = {
        user_id: user.id,
        skill: activeSkill,
        target_role: targetRole || `${activeSkill} Developer`,
        selected_skills: skillsToTest
      }

      const res = await api('/assessment/multi-round/start', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token)

      if (!res.rounds || res.rounds.length === 0) {
        throw new Error('Could not generate assessment rounds.')
      }

      setAssessmentRounds(res.rounds)
      setAssessmentSkill(activeSkill)
      const firstRound = res.rounds[0]
      setRoundTimeLeft(firstRound.duration_seconds || 600)

      // Initialize starter code for coding round
      const codingRound = res.rounds.find(r => r.type === 'coding')
      if (codingRound && (codingRound.questions || codingRound.coding_problems)) {
        const cProblems = codingRound.questions || codingRound.coding_problems || []
        const initSolutions = {}
        cProblems.forEach(q => {
          const lang = (q.language || (activeSkill.toLowerCase().includes('sql') ? 'sql' : (activeSkill.toLowerCase().includes('java') && !activeSkill.toLowerCase().includes('javascript') ? 'java' : (activeSkill.toLowerCase().includes('c++') ? 'cpp' : (activeSkill.toLowerCase().includes('script') ? 'javascript' : 'python'))))).toLowerCase()
          initSolutions[q.id] = {
            code: q.starter_code?.[lang] || q.starter_code?.python || '# Write solution here\n',
            language: lang
          }
        })
        setCodingSolutions(initSolutions)
      }

      setAssessmentActive(true)
      setGlobalMessage(`Assessment Started for ${activeSkill}! Round 1: ${firstRound.name} (10 Questions • 10 Minutes). Total 4 Rounds • 60 Minutes.`)
    } catch (err) {
      setGlobalMessage(`Unable to start assessment: ${err.message}`)
    } finally {
      setAssessmentLoading(false)
    }
  }

  function handleSelectRoundAnswer(roundId, questionId, optIdx) {
    setRoundAnswers(prev => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        [questionId]: optIdx
      }
    }))
  }

  function handleUpdateCodingCode(challengeId, newCode, language = 'python') {
    setCodingSolutions(prev => ({
      ...prev,
      [challengeId]: {
        code: newCode,
        language
      }
    }))
  }

  async function handleRunCodingSolution(challengeId) {
    const solutionObj = codingSolutions[challengeId] || { code: '', language: 'python' }
    if (!solutionObj.code.trim()) {
      setGlobalMessage('Please write some code before running test cases.')
      return
    }

    setIsRunningCode(true)
    setCodingRunResult(null)

    try {
      const res = await api('/assessment/multi-round/run-code', {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challengeId,
          problem_id: challengeId,
          skill: assessmentSkill || 'python',
          code: solutionObj.code,
          language: solutionObj.language || 'python'
        })
      }, token)

      setCodingRunResult(res)
    } catch (err) {
      setCodingRunResult({
        success: false,
        all_passed: false,
        error: err.message,
        results: []
      })
    } finally {
      setIsRunningCode(false)
    }
  }

  async function handleAutoAdvanceRound() {
    // Automatically submit current round and advance to next round on 00:00 timer expiry
    const currentRound = assessmentRounds[activeRoundIdx]
    const nextIdx = activeRoundIdx + 1

    if (nextIdx < assessmentRounds.length) {
      const nextRound = assessmentRounds[nextIdx]
      setAutoSubmitToast(`⏰ Time expired for ${currentRound?.name || 'Current Round'}! Automatically submitted. Starting ${nextRound.name} (${nextRound.duration_minutes} mins)...`)
      setTimeout(() => setAutoSubmitToast(''), 5000)

      setActiveRoundIdx(nextIdx)
      setActiveQuestionIdx(0)
      setRoundTimeLeft(nextRound.duration_seconds || 600)
      setCodingRunResult(null)
    } else {
      // Final round expired: Auto submit all rounds
      setAutoSubmitToast('⏰ Time expired for Coding Round! Submitting final assessment...')
      await handleSubmitAllRounds(true)
    }
  }

  async function handleAdvanceToNextRoundManual() {
    const currentRound = assessmentRounds[activeRoundIdx]
    const nextIdx = activeRoundIdx + 1

    if (nextIdx < assessmentRounds.length) {
      const answeredInRound = Object.keys(roundAnswers[currentRound.id] || {}).length
      const totalInRound = currentRound.questions.length

      if (currentRound.type === 'mcq' && answeredInRound < totalInRound) {
        const confirmAdvance = window.confirm(
          `You answered ${answeredInRound} of ${totalInRound} questions in ${currentRound.name}. Submit round and proceed to ${assessmentRounds[nextIdx].name}?`
        )
        if (!confirmAdvance) return
      }

      const nextRound = assessmentRounds[nextIdx]
      setActiveRoundIdx(nextIdx)
      setActiveQuestionIdx(0)
      setRoundTimeLeft(nextRound.duration_seconds || 600)
      setCodingRunResult(null)
      setGlobalMessage(`Round ${nextIdx + 1}: ${nextRound.name} started (${nextRound.duration_minutes} minutes).`)
    } else {
      await handleSubmitAllRounds(false)
    }
  }

  async function handleSubmitAllRounds(isAuto = false) {
    if (!isAuto) {
      const confirmSubmit = window.confirm('Are you ready to submit your complete 60-minute assessment?')
      if (!confirmSubmit) return
    }

    setAssessmentSubmitting(true)
    setGlobalMessage('')

    try {
      const roundsPayload = assessmentRounds.map(r => {
        if (r.type === 'mcq') {
          const rAns = roundAnswers[r.id] || {}
          const ansList = Object.entries(rAns).map(([qid, opt]) => ({
            question_id: qid,
            selected_option: opt
          }))
          return {
            round_id: r.id,
            answers: ansList
          }
        } else {
          // Coding round
          const ansList = (r.questions || []).map(q => {
            const sol = codingSolutions[q.id] || { code: '', language: 'python' }
            return {
              question_id: q.id,
              code: sol.code,
              language: sol.language
            }
          })
          return {
            round_id: r.id,
            answers: ansList
          }
        }
      })

      const payload = {
        user_id: user.id,
        skill: assessmentSkill || (selectedAssessmentSkills[0] || 'Python'),
        target_role: targetRole || `${assessmentSkill || 'Python'} Developer`,
        selected_skills: [assessmentSkill || (selectedAssessmentSkills[0] || 'Python')],
        rounds: roundsPayload
      }

      const result = await api('/assessment/multi-round/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token)

      setDiagnosticResult(result)
      setActiveAssessmentCert(result)
      setShowCertificateModal(true)
      setAssessmentActive(false)
      setGlobalMessage(`🎉 Assessment Completed! Overall Score: ${result.overall_score}% (${result.skill_level}). Your Official VERIXA Certificate is issued!`)

      if (user?.id) {
        await loadAllUserData(user.id, token)
      }
    } catch (err) {
      setGlobalMessage(`Submission error: ${err.message}`)
    } finally {
      setAssessmentSubmitting(false)
    }
  }

  function handleCancelAssessment() {
    if (window.confirm('Are you sure you want to exit the assessment? Your active progress in this session will be discarded.')) {
      setAssessmentActive(false)
      setRoundAnswers({})
      setCodingSolutions({})
      setGlobalMessage('Assessment session exited.')
    }
  }

  // Backward compatibility wrapper for single button
  async function handleStartDiagnosticTest() {
    await handleStartMultiRoundAssessment()
  }

  function handleSelectDiagAnswer(questionId, optIdx) {
    if (assessmentRounds.length > 0 && assessmentRounds[activeRoundIdx]) {
      handleSelectRoundAnswer(assessmentRounds[activeRoundIdx].id, questionId, optIdx)
    } else {
      setDiagnosticAnswers(prev => ({ ...prev, [questionId]: optIdx }))
    }
  }

  async function handleAutoSubmitDiagnostic() {
    await handleAutoAdvanceRound()
  }

  async function handleSubmitDiagnosticTest(e, force = false) {
    if (e) e.preventDefault()
    await handleSubmitAllRounds(force)
  }

  // Toggle skill from resume in the diagnostic setup
  function handleToggleAssessmentSkill(skill) {
    setSelectedAssessmentSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill)
      } else {
        return [...prev, skill]
      }
    })
  }

  async function handleTargetRoleChange(newRole) {
    setTargetRole(newRole)
    if (user?.id && token) {
      try {
        const matrixData = await api(`/assessment/skill-profile/${user.id}?target_role=${encodeURIComponent(newRole)}`, {}, token)
        setSkillMatrixData(matrixData)
      } catch (e) {
        console.warn('Skill matrix reload error:', e)
      }
    }
  }

  // =====================================================
  // LEGACY SINGLE-SKILL ASSESSMENT HANDLERS
  // =====================================================

  async function handleStartAssessment(skillToTest) {
    const selectedSkill = (skillToTest || assessmentSkill || '').trim()
    if (!selectedSkill) {
      setGlobalMessage('Please select or type a skill to verify.')
      return
    }

    if (!user) {
      setAssessmentSkill(selectedSkill)
      setGlobalMessage('Please sign in or create an account to start your assessment.')
      setAuthMode('register')
      navigateTo('auth')
      return
    }

    setAssessmentLoading(true)
    setGlobalMessage('')
    setQuizResult(null)
    setQuizQuestions([])
    setQuizAnswers({})

    try {
      const data = await api('/assessment/start', {
        method: 'POST',
        body: JSON.stringify({ skill: selectedSkill, user_id: user.id }),
      }, token)

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No assessment questions generated. Please try again.')
      }

      setAssessmentSkill(selectedSkill)
      setQuizQuestions(data.questions)
      navigateTo('assessment_quiz')
    } catch (err) {
      setGlobalMessage(`Assessment generator error: ${err.message}`)
    } finally {
      setAssessmentLoading(false)
    }
  }

  function handleSelectAnswer(questionId, optionIndex) {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }))
  }

  async function handleSubmitAssessment(e) {
    if (e) e.preventDefault()
    if (quizQuestions.length === 0) return

    setQuizSubmitting(true)
    setGlobalMessage('')

    try {
      const answersPayload = Object.entries(quizAnswers).map(([qid, opt]) => ({
        question_id: parseInt(qid),
        selected_option: typeof opt === 'number' ? opt : (opt.charCodeAt(0) - 65)
      }))

      const submissionPayload = {
        skill: assessmentSkill,
        user_id: user?.id,
        answers: answersPayload
      }

      const result = await api('/assessment/submit', {
        method: 'POST',
        body: JSON.stringify(submissionPayload),
      }, token)

      setQuizResult(result)
      setGlobalMessage(`Assessment completed for ${assessmentSkill}! Score: ${result.score}% (${result.status})`)
      if (user?.id) await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Submission error: ${err.message}`)
    } finally {
      setQuizSubmitting(false)
    }
  }

  // =====================================================
  // PROJECT MANAGEMENT HANDLERS (STRICT SKILLS RESTRICTION)
  // =====================================================

  function openAddProjectModal() {
    setProjectForm({
      name: '',
      description: '',
      technologies_used: '',
      skills_used: [],
      status: 'Completed',
      github_link: '',
      demo_link: '',
      editingId: null
    })
    setShowProjectModal(true)
  }

  function openEditProjectModal(proj) {
    setProjectForm({
      name: proj.name,
      description: proj.description,
      technologies_used: proj.technologies_used,
      skills_used: proj.skills || (proj.skills_used ? proj.skills_used.split(',').map(s => s.trim()) : []),
      status: proj.status || 'Completed',
      github_link: proj.github_link || '',
      demo_link: proj.demo_link || '',
      editingId: proj.id
    })
    setShowProjectModal(true)
  }

  function handleToggleProjectSkill(skill) {
    setProjectForm(prev => {
      const exists = prev.skills_used.includes(skill)
      return {
        ...prev,
        skills_used: exists
          ? prev.skills_used.filter(s => s !== skill)
          : [...prev.skills_used, skill]
      }
    })
  }

  async function handleSaveProject(e) {
    e.preventDefault()
    if (!projectForm.name.trim()) {
      setGlobalMessage('Please provide a project name.')
      return
    }

    setProjectSaving(true)
    setGlobalMessage('')

    try {
      const payload = {
        user_id: user?.id,
        name: projectForm.name,
        description: projectForm.description,
        technologies_used: projectForm.technologies_used,
        skills_used: projectForm.skills_used.join(', '),
        status: projectForm.status,
        github_link: projectForm.github_link,
        demo_link: projectForm.demo_link
      }

      if (projectForm.editingId) {
        await api(`/projects/${projectForm.editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        }, token)
        setGlobalMessage(`Project "${projectForm.name}" updated successfully!`)
      } else {
        await api('/projects', {
          method: 'POST',
          body: JSON.stringify(payload)
        }, token)
        setGlobalMessage(`Project "${projectForm.name}" added to verified portfolio!`)
      }

      setShowProjectModal(false)
      if (user?.id) await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Unable to save project: ${err.message}`)
    } finally {
      setProjectSaving(false)
    }
  }

  async function handleDeleteProject(projId) {
    if (!window.confirm('Are you sure you want to delete this project from your verified portfolio?')) return

    try {
      await api(`/projects/${projId}`, {
        method: 'DELETE',
        body: JSON.stringify({ user_id: user?.id })
      }, token)
      setGlobalMessage('Project deleted successfully.')
      if (user?.id) await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Delete error: ${err.message}`)
    }
  }

  // =====================================================
  // RESUME & CERTIFICATE UPLOAD HANDLERS
  // =====================================================

  async function handleResumeUpload(e) {
    e.preventDefault()
    if (!resumeFile) {
      setGlobalMessage('Please select a resume file (PDF, DOC, DOCX, or TXT).')
      return
    }

    if (!user?.id) {
      setGlobalMessage('Please sign in to upload and verify your resume.')
      return
    }

    setResumeUploading(true)
    setGlobalMessage('')

    try {
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('file', resumeFile)

      const data = await api('/resume/upload', {
        method: 'POST',
        body: formData,
      }, token)

      setGlobalMessage(`Resume Uploaded Successfully! Score: ${data.resume_score || 0}/100. ${data.filename || ''}`)
      setResumeFile(null)
      const fileInput = document.getElementById('resume-file-input')
      if (fileInput) fileInput.value = ''
      await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Unable to upload resume: ${err.message}`)
    } finally {
      setResumeUploading(false)
    }
  }

  async function handleRemoveResume(resumeId) {
    if (!resumeId) return
    const confirmed = window.confirm("Are you sure you want to remove this resume?")
    if (!confirmed) return

    setDeletingResumeId(resumeId)
    setGlobalMessage('')

    try {
      await api(`/resume/${resumeId}`, {
        method: 'DELETE'
      }, token)

      // Immediately update local list
      setResumeList(prev => prev.filter(r => r.id !== resumeId))
      setGlobalMessage('Resume removed successfully.')
      if (user?.id) {
        await loadAllUserData(user.id, token)
      }
    } catch (err) {
      setGlobalMessage(`Unable to remove resume: ${err.message}`)
    } finally {
      setDeletingResumeId(null)
    }
  }

  function handleViewResume(resume) {
    if (!resume) return
    const fn = (resume.filename || '').toLowerCase()
    const isPdf = fn.endsWith('.pdf') || resume.file_type === 'pdf'

    if (isPdf) {
      // Open PDF directly in a new browser tab
      const fileUrl = `${API_URL}/resume/${resume.id}/file`
      window.open(fileUrl, '_blank')
    } else {
      // For DOC, DOCX, TXT or preview, show document information modal
      setViewResumeModal(resume)
    }
  }

  async function handleCertUpload(e) {
    e.preventDefault()
    if (!certFile) {
      setGlobalMessage('Please select a certificate image or PDF.')
      return
    }

    if (!user?.id) {
      setGlobalMessage('Please sign in to upload and verify your certificate.')
      return
    }

    setCertUploading(true)
    setGlobalMessage('')

    try {
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('file', certFile)
      if (certIssuer) formData.append('issuer', certIssuer)
      if (certYear) formData.append('issue_year', certYear)

      const data = await api('/documents/certificate', {
        method: 'POST',
        body: formData,
      }, token)

      setGlobalMessage(`Certificate verified! Status: ${data.verification_status} (${data.issuer || 'Issuer'}).`)
      setCertFile(null)
      setCertIssuer('')
      setCertYear('')
      const certInput = document.getElementById('cert-file-input')
      if (certInput) certInput.value = ''
      await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Unable to verify certificate. ${err.message}`)
    } finally {
      setCertUploading(false)
    }
  }

  async function handleRemoveCertificate(certId) {
    if (!certId) return
    const confirmed = window.confirm("Are you sure you want to remove this certificate from your verified portfolio?")
    if (!confirmed) return

    setDeletingCertId(certId)
    setGlobalMessage('')

    try {
      await api(`/documents/certificate/${certId}`, {
        method: 'DELETE'
      }, token)

      setCertificatesList(prev => prev.filter(c => c.id !== certId))
      setGlobalMessage('Certificate removed successfully.')
      if (user?.id) {
        await loadAllUserData(user.id, token)
      }
    } catch (err) {
      setGlobalMessage(`Unable to remove certificate: ${err.message}`)
    } finally {
      setDeletingCertId(null)
    }
  }

  // =====================================================
  // REAL JOB APPLY & BOOKMARK HANDLERS
  // =====================================================

  function handleApplyJob(job) {
    setRedirectNotice({
      title: job.title,
      company: job.company,
      source: job.source,
      url: job.source_url
    })

    setTimeout(() => {
      window.open(job.source_url, '_blank', 'noopener,noreferrer')
    }, 500)
  }

  async function handleToggleSaveJob(job) {
    if (!user?.id) return
    const isSaved = job.is_saved

    try {
      if (isSaved) {
        await api('/jobs/unsave', {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, job_id: job.id })
        }, token)
        setGlobalMessage(`Removed "${job.title}" from saved jobs.`)
      } else {
        await api('/jobs/save', {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, job_id: job.id })
        }, token)
        setGlobalMessage(`Saved "${job.title}" to your bookmarks!`)
      }
      await loadAllUserData(user.id, token)
    } catch (err) {
      setGlobalMessage(`Save action failed: ${err.message}`)
    }
  }

  // Filtered Job Recommendations
  const filteredJobs = useMemo(() => {
    let list = []
    const cats = jobRecommendations?.categories || {}

    if (activeJobTab === 'recommended') {
      list = cats.recommended_jobs || cats.high_match_jobs || cats.best_matches || []
    } else if (activeJobTab === 'internships') {
      list = cats.internships || (cats.all_jobs || []).filter(j => (j.job_type || '').toLowerCase().includes('intern') || (j.title || '').toLowerCase().includes('intern'))
    } else if (activeJobTab === 'saved') {
      list = cats.saved_jobs || (cats.all_jobs || []).filter(j => j.is_saved)
    } else {
      list = cats.all_jobs || []
    }

    // Work Mode Filter
    if (jobWorkModeFilter !== 'All') {
      list = list.filter(j => (j.work_mode || '').toLowerCase() === jobWorkModeFilter.toLowerCase())
    }

    // Experience Level Filter
    if (jobExpFilter !== 'All') {
      list = list.filter(j => (j.experience_level || '').toLowerCase().includes(jobExpFilter.toLowerCase()))
    }

    // Search Query
    if (jobSearchQuery.trim()) {
      const q = jobSearchQuery.toLowerCase()
      list = list.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q) ||
        (j.required_skills || []).some(s => (typeof s === 'string' ? s : '').toLowerCase().includes(q))
      )
    }

    return list
  }, [jobRecommendations, activeJobTab, jobWorkModeFilter, jobExpFilter, jobSearchQuery])

  // Render Loader during initial load
  if (loadingInitial) {
    return (
      <div className="loader-screen">
        <div className="loader-box">
          <div className="loader-spinner" />
          <h2 className="loader-title">VERI<span>XA</span></h2>
          <p className="loader-sub">Restoring verified career session...</p>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER APP
  // =====================================================

  return (
    <div className="app-root">
      {/* BACKGROUND AMBIENT GLOW BLOBS */}
      <div className="ambient-blob blob-1" />
      <div className="ambient-blob blob-2" />

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigateTo(user ? 'dashboard' : 'home')}>
          VERI<span>XA</span>
        </div>

        <div className="nav-links">
          {!user ? (
            <>
              <button className={page === 'home' ? 'active' : ''} onClick={() => navigateTo('home')}>Home</button>
              <button onClick={() => { setAuthMode('login'); navigateTo('auth'); }}>Login</button>
              <button className="nav-btn-primary" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>Get Started</button>
            </>
          ) : (
            <>
              <button className={page === 'dashboard' ? 'active' : ''} onClick={() => navigateTo('dashboard')}>Dashboard</button>
              <button className={page === 'assessment' ? 'active' : ''} onClick={() => navigateTo('assessment')}>Assessment</button>
              <button className={page === 'verification' ? 'active' : ''} onClick={() => navigateTo('verification')}>Verification</button>
              <button className={page === 'skills' ? 'active' : ''} onClick={() => navigateTo('skills')}>Skill Analysis</button>
              <button className={page === 'jobs' ? 'active' : ''} onClick={() => navigateTo('jobs')}>Jobs & Internships</button>
              <button onClick={handleLogout} className="btn-logout">Logout ({(user?.name || user?.email || 'User').split(' ')[0]})</button>
            </>
          )}
        </div>
      </nav>

      {/* GLOBAL NOTIFICATION ALERT */}
      {globalMessage && (
        <div className="alert-wrapper">
          <div className="banner-alert info" style={{ marginBottom: '8px' }}>
            <span>{globalMessage}</span>
            <button
              onClick={() => setGlobalMessage('')}
              className="alert-close-btn"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* REDIRECT POPUP NOTIFICATION */}
      {redirectNotice && (
        <div className="redirect-modal-toast">
          <div className="redirect-toast-header">
            <span className="redirect-tag">Redirecting to Official Source</span>
            <button onClick={() => setRedirectNotice(null)} className="toast-close">✕</button>
          </div>
          <p className="redirect-title">{redirectNotice.title} at {redirectNotice.company}</p>
          <p className="redirect-sub">Opening application portal on <strong>{redirectNotice.source}</strong> in a new tab...</p>
        </div>
      )}

      {/* =====================================================
          PAGE: HOME (GUEST)
      ===================================================== */}
      {page === 'home' && !user && (
        <div className="app-container">
          {/* HERO SECTION */}
          <div className="hero-section">
            <div className="hero-left">
              <div className="hero-badge-pill animate-fade-in">
                <span className="live-pulse-dot"></span>
                <span>AI-Powered Recruitment & Verification Engine</span>
              </div>
              <h1 className="hero-headline animate-slide-up">
                BUILD YOUR CAREER WITH <span>CONFIDENCE</span>.
              </h1>
              <p className="hero-desc animate-fade-in-delayed">
                Verify your skills through a 60-minute 4-round assessment, authenticate resumes and certificates, measure your transparent 70/10/10/10 career score, and unlock genuine job opportunities.
              </p>

              {/* FLOATING BENEFIT BADGES */}
              <div className="hero-perks-row animate-fade-in-delayed">
                <span className="hero-perk-chip">⚡ 4-Round Timed Assessment</span>
                <span className="hero-perk-chip">🎓 Verifiable VERIXA Certificate</span>
                <span className="hero-perk-chip">📊 70/10/10/10 Readiness Score</span>
              </div>

              <div className="hero-btns animate-fade-in-delayed" style={{ marginTop: '20px' }}>
                <button className="btn-primary hero-cta-btn glow-button" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
                  <span>Get Started Free</span>
                  <span className="btn-arrow">→</span>
                </button>
                <button className="btn-secondary hero-signin-btn" onClick={() => { setAuthMode('login'); navigateTo('auth'); }}>
                  Sign In to Dashboard
                </button>
              </div>
            </div>

            <div className="hero-right animate-float">
              <div className="hero-card-preview glowing-border-card">
                <div className="preview-header">
                  <div className="preview-dot dot-red" />
                  <div className="preview-dot dot-yellow" />
                  <div className="preview-dot dot-green" />
                  <span className="engine-badge">VERIXA VERIFICATION ENGINE v2.0</span>
                </div>
                <div className="preview-body">
                  <div className="preview-stat interactive-stat-hover">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Career Readiness Standard:</span>
                      <span className="stat-status-pill">70/10/10/10</span>
                    </div>
                    <strong>70% Assessments + 10% Resume + 10% Certificates + 10% Projects</strong>
                  </div>
                  <div className="preview-stat interactive-stat-hover">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>4-Round Multi-Disciplinary Test:</span>
                      <span className="stat-status-pill success">60 Mins</span>
                    </div>
                    <strong style={{ color: '#10b981' }}>Aptitude (25%) + Technical (25%) + Verbal (25%) + Coding (25%)</strong>
                  </div>
                  <div className="preview-stat interactive-stat-hover">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Instant Outcome:</span>
                      <span className="stat-status-pill info">Official</span>
                    </div>
                    <strong style={{ color: '#38bdf8' }}>Official Verifiable Skill Certificate for Internships & Jobs</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6 FEATURE CARDS */}
          <div className="section-title">
            <h2>The Complete Verification Workflow</h2>
            <p>From dynamic skill testing to transparent readiness scoring and legitimate job matching</p>
          </div>
          <div className="feature-grid">
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">⚡</div>
              <h3>1. Skill Assessment</h3>
              <p>Test across Python, Java, React, SQL, Cloud, AI, and any custom skill with a balanced 10-MCQ difficulty curve.</p>
            </div>
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">📄</div>
              <h3>2. Resume Verification</h3>
              <p>Evaluates structure, contact info, detected sections, and extracts verifiable technical skills without hallucination.</p>
            </div>
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">🏆</div>
              <h3>3. Certificate Verification</h3>
              <p>Authenticates credential issuer, completion date, and validity to contribute to your verified readiness portfolio.</p>
            </div>
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">📊</div>
              <h3>4. Career Score</h3>
              <p>Calculates transparent career readiness from your verified components (70% Assessments + 10% Resume + 10% Certificates + 10% Projects).</p>
            </div>
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">🎯</div>
              <h3>5. Job Matching</h3>
              <p>Calculates precise match percentages based on your verified skills and identifies missing requirements.</p>
            </div>
            <div className="feature-card" onClick={() => { setAuthMode('register'); navigateTo('auth'); }}>
              <div className="feature-icon">💼</div>
              <h3>6. Real Job Opportunities</h3>
              <p>Strictly authentic opportunities with direct application links to original portals like LinkedIn and Indeed.</p>
            </div>
          </div>

          {/* INTERACTIVE SKILL TEST SANDBOX */}
          <div className="sandbox-section">
            <div className="sandbox-header">
              <div>
                <span className="badge-tag" style={{ marginBottom: '8px' }}>Test Any Skill Instantly</span>
                <h3 className="sandbox-title">Try the Dynamic Assessment Engine</h3>
                <p className="sandbox-sub">Select any technology below or type your custom skill to generate a tailored 10-question evaluation.</p>
              </div>
              <div className="sandbox-input-row">
                <input
                  type="text"
                  placeholder="Enter any skill (e.g. React, SQL, Cloud)..."
                  value={assessmentSkill}
                  onChange={(e) => setAssessmentSkill(e.target.value)}
                  className="sandbox-input"
                />
                <button
                  className="btn-primary"
                  onClick={() => handleStartAssessment(assessmentSkill)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Start Test
                </button>
              </div>
            </div>

            <div className="popular-tags-grid">
              {POPULAR_SKILLS.map((sk) => (
                <button
                  key={sk}
                  className={`skill-tag-pill ${assessmentSkill.toLowerCase() === sk.toLowerCase() ? 'active' : ''}`}
                  onClick={() => {
                    setAssessmentSkill(sk)
                    handleStartAssessment(sk)
                  }}
                >
                  {sk}
                </button>
              ))}
            </div>
          </div>

          {/* VERIFIED HIRING PLATFORMS SHOWCASE */}
          <div className="section-title">
            <h2>Authentic Job Distribution Sources</h2>
            <p>We match opportunities with verified company identities and direct apply portals.</p>
          </div>
          <div className="feature-grid" style={{ marginBottom: '32px' }}>
            {VERIFIED_PLATFORMS.map((plat, idx) => (
              <div key={idx} className="feature-card">
                <div className="feature-icon">{plat.icon}</div>
                <h3>{plat.name}</h3>
                <p>{plat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          PAGE: AUTH (LOGIN / SIGNUP) - ENHANCED ANIMATED SHOWCASE
      ===================================================== */}
      {page === 'auth' && (
        <div className="app-container auth-page-container animate-fade-in">
          <div className="auth-showcase-wrapper">
            {/* LEFT BRAND PROMO PANEL */}
            <div className="auth-promo-panel">
              <div className="auth-promo-badge">
                <span className="live-pulse-dot"></span>
                <span>VERIXA Verified Talent Ecosystem</span>
              </div>
              <h2 className="auth-promo-title">
                One Credential.<br />
                <span>Unlimited Opportunities.</span>
              </h2>
              <p className="auth-promo-desc">
                Take the official 60-minute 4-round assessment to evaluate your Aptitude, Technical Skill, Verbal Ability, and Coding. Earn your tamper-evident VERIXA Skill Certificate recognized for top internships and full-time hiring.
              </p>

              <div className="auth-perk-cards">
                <div className="auth-perk-item">
                  <span className="perk-icon">🎯</span>
                  <div>
                    <strong>70/10/10/10 Career Readiness</strong>
                    <p>Transparent formula: 70% Assessment + 10% Resume + 10% Certs + 10% Projects</p>
                  </div>
                </div>
                <div className="auth-perk-item">
                  <span className="perk-icon">🏆</span>
                  <div>
                    <strong>Official Skill Certificate</strong>
                    <p>Instant verifiable certificate with multi-round transcript breakdown</p>
                  </div>
                </div>
                <div className="auth-perk-item">
                  <span className="perk-icon">💼</span>
                  <div>
                    <strong>Direct Verified Applications</strong>
                    <p>Match with genuine postings from LinkedIn, Indeed, and Internshala</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT FORM CARD */}
            <div className="auth-card animated-auth-card">
              <div className="auth-mode-toggle">
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setGlobalMessage(''); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('register'); setGlobalMessage(''); }}
                >
                  Create Account
                </button>
              </div>

              <h2>{authMode === 'login' ? 'Welcome Back to Verixa' : 'Join Verixa Talent Network'}</h2>
              <p className="auth-sub">
                {authMode === 'login'
                  ? 'Enter your credentials to access your verified career readiness profile.'
                  : 'Start your verification journey and earn your verified talent certificate.'}
              </p>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === 'register' && (
                  <div className="form-group animated-form-input">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group animated-form-input">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group animated-form-input">
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {authMode === 'register' && (
                  <div className="form-group animated-form-input">
                    <label>Account Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="student">Student / Candidate</option>
                      <option value="recruiter">Recruiter / Employer</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                )}

                <button type="submit" className="btn-primary auth-submit-btn glow-button" disabled={authLoading}>
                  {authLoading ? 'Authenticating...' : (authMode === 'login' ? 'Sign In to Dashboard →' : 'Create Account & Start Verification →')}
                </button>
              </form>

              <div className="auth-switch">
                {authMode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <span onClick={() => { setAuthMode('register'); setGlobalMessage(''); }}>Create one for free</span>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <span onClick={() => { setAuthMode('login'); setGlobalMessage(''); }}>Sign in to continue</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PAGE: USER DASHBOARD
      ===================================================== */}
      {page === 'dashboard' && user && (
        <div className="app-container">
          <div className="dashboard-welcome">
            <div>
              <span className="badge-tag">Verified Career Profile</span>
              <h1>Welcome Back, <span>{user?.name || user?.email || 'User'}</span></h1>
              <p>Track your verified credentials, diagnostic assessment scores, practical projects, and career readiness.</p>
            </div>
            <div className="dashboard-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                disabled={isRefreshing}
                onClick={() => user?.id && loadAllUserData(user.id, token)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className={isRefreshing ? 'spin-icon' : ''} style={{ fontSize: '15px' }}>↻</span>
                <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
              </button>
              <button className="btn-primary" onClick={() => navigateTo('assessment')}>
                Take Diagnostic Assessment
              </button>
            </div>
          </div>

          {/* READINESS SUMMARY CARD - EXACT 70/10/10/10 FORMULA */}
          <div className="readiness-banner-card">
            <div className="readiness-banner-left">
              <span className="readiness-label">Overall Career Readiness Score</span>
              <div className="readiness-score-display">
                <span className="big-score">{careerScore?.overall_score ?? (diagnosticResult?.overall_score ? Math.round(diagnosticResult.overall_score * 0.7) : 0)}</span>
                <span className="score-max">/ 100</span>
                <span className={`readiness-status-badge ${(careerScore?.status || 'Needs Verification').toLowerCase().replace(/\s+/g, '-')}`}>
                  {careerScore?.status || 'In Progress'}
                </span>
              </div>
              <p className="readiness-formula-note">
                <strong>Weighted Formula:</strong> (70% Assessment) + (10% Resume) + (10% Certificates) + (10% Projects)
              </p>
              <div style={{ marginTop: '12px' }}>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => navigateTo('assessment')}>
                  Improve Assessment (70% weight) →
                </button>
              </div>
            </div>

            <div className="readiness-components-breakdown">
              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Diagnostic & Technical Assessment (70%)</span>
                  <strong>{careerScore?.breakdown?.assessment?.score ?? (diagnosticResult?.overall_score ?? (skillsProfile.length > 0 ? skillsProfile[0].score : 0))}/100</strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.assessment?.score ?? (diagnosticResult?.overall_score ?? (skillsProfile.length > 0 ? skillsProfile[0].score : 0))}%`, background: '#6366f1' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Contribution: {careerScore?.breakdown?.assessment?.contribution ?? ((careerScore?.breakdown?.assessment?.score ?? 0) * 0.7).toFixed(1)} pts</span>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Resume Analysis & Completeness (10%)</span>
                  <strong>{careerScore?.breakdown?.resume?.score ?? (resumeData?.resume_score ?? 0)}/100</strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.resume?.score ?? (resumeData?.resume_score ?? 0)}%`, background: '#10b981' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Contribution: {careerScore?.breakdown?.resume?.contribution ?? ((careerScore?.breakdown?.resume?.score ?? 0) * 0.1).toFixed(1)} pts</span>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Certificate Authenticity (10%)</span>
                  <strong>{careerScore?.breakdown?.certificates?.score ?? (certificatesList.length > 0 ? 100 : 0)}/100</strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.certificates?.score ?? (certificatesList.length > 0 ? 100 : 0)}%`, background: '#f59e0b' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Contribution: {careerScore?.breakdown?.certificates?.contribution ?? ((careerScore?.breakdown?.certificates?.score ?? 0) * 0.1).toFixed(1)} pts</span>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Verified Projects Portfolio (10%)</span>
                  <strong>{careerScore?.breakdown?.projects?.score ?? (userProjects.length > 0 ? 100 : 0)}/100</strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.projects?.score ?? (userProjects.length > 0 ? 100 : 0)}%`, background: '#ec4899' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Contribution: {careerScore?.breakdown?.projects?.contribution ?? ((careerScore?.breakdown?.projects?.score ?? 0) * 0.1).toFixed(1)} pts {userProjects.length === 0 ? '(0% - No projects added)' : ''}</span>
              </div>
            </div>
          </div>

          {/* MISSING ITEMS ALERT IF INCOMPLETE */}
          {careerScore?.missing_components && careerScore.missing_components.length > 0 && (
            <div className="banner-alert warning" style={{ marginBottom: '25px' }}>
              <div>
                <strong>Actions to Boost Your Overall Career Score:</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {careerScore.missing_components.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* KPI STATS ROW */}
          <div className="kpi-grid">
            <div className="kpi-card" onClick={() => navigateTo('assessment')}>
              <div className="kpi-icon">🎯</div>
              <div className="kpi-info">
                <span className="kpi-title">Diagnostic Test</span>
                <span className="kpi-value">{diagnosticResult?.has_taken ? `${diagnosticResult.overall_score}%` : 'Not Taken'}</span>
                <span className="kpi-sub">{diagnosticResult?.has_taken ? `Level: ${diagnosticResult.skill_level}` : 'Take 15-min Practice Test'}</span>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigateTo('verification')}>
              <div className="kpi-icon">📄</div>
              <div className="kpi-info">
                <span className="kpi-title">Resume Score</span>
                <span className="kpi-value">
                  {resumeData ? `${resumeData.resume_score || 0}/100` : 'Not Uploaded'}
                </span>
                <span className="kpi-sub">
                  {resumeData ? `${(resumeData.skills || []).length} technical skills extracted` : 'Upload to extract skills'}
                </span>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigateTo('verification')}>
              <div className="kpi-icon">🏆</div>
              <div className="kpi-info">
                <span className="kpi-title">Certificates</span>
                <span className="kpi-value">{certificatesList.length}</span>
                <span className="kpi-sub">{certificatesList.filter(c => c.verification_status === 'VERIFIED').length} verified authentic</span>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigateTo('verification')}>
              <div className="kpi-icon">💻</div>
              <div className="kpi-info">
                <span className="kpi-title">Verified Projects</span>
                <span className="kpi-value">{userProjects.length}</span>
                <span className="kpi-sub">{userProjects.length > 0 ? '10/10 Score Contribution' : '0% Contribution (Add Project)'}</span>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigateTo('jobs')}>
              <div className="kpi-icon">💼</div>
              <div className="kpi-info">
                <span className="kpi-title">Matching Jobs</span>
                <span className="kpi-value">{jobRecommendations?.total_jobs_found || 18}</span>
                <span className="kpi-sub">Real openings & internships</span>
              </div>
            </div>
          </div>

          {/* DASHBOARD ACTION TILES */}
          <div className="dashboard-grid-tiles">
            <div className="tile-card" onClick={() => navigateTo('assessment')}>
              <h3>⚡ Practice Test & Diagnostic Assessment</h3>
              <p>Test across 5 core competencies (MCQ, Aptitude, Communication, Team Management, Case Study).</p>
              <span className="tile-link">Open Assessment →</span>
            </div>

            <div className="tile-card" onClick={() => navigateTo('verification')}>
              <h3>📁 Verify Resume, Certs & Projects</h3>
              <p>Upload your resume, authenticate certifications, and build a verified practical project portfolio.</p>
              <span className="tile-link">Verification Center →</span>
            </div>

            <div className="tile-card" onClick={() => navigateTo('skills')}>
              <h3>📊 Skill Matrix & Gap Analysis</h3>
              <p>Compare your verified competencies against industry target roles and pinpoint missing skills.</p>
              <span className="tile-link">View Skill Analysis →</span>
            </div>

            <div className="tile-card" onClick={() => navigateTo('jobs')}>
              <h3>💼 Authentic Jobs & Internships</h3>
              <p>Discover real job openings and internships matched with precision to your verified skill profile.</p>
              <span className="tile-link">Browse Opportunities →</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
      {/* =====================================================
          PAGE: 60-MINUTE 4-ROUND ASSESSMENT SYSTEM
          Round 1: Aptitude (10 Qs • 10 Mins • 5-min warning)
          Round 2: Technical Skills (10 Qs • 10 Mins • 5-min warning)
          Round 3: Verbal Ability (10 Qs • 10 Mins • 5-min warning)
          Round 4: Coding (2 Qs • 30 Mins • 5-min warning at 25 min elapsed)
          Total: 60 Minutes
      ===================================================== */}
      {page === 'assessment' && user && (
        <div className="app-container">
          {/* FLOATING 5-MINUTE TIME WARNING POP-UP (RIGHT SIDE OF SCREEN) */}
          {timeWarningPopup.show && (
            <div className="time-warning-popup-float">
              <div className="warning-popup-header">
                <div className="warning-popup-title-group">
                  <span className="warning-pulse-icon">⚠️</span>
                  <strong className="warning-popup-title">Test Ending Soon</strong>
                </div>
                <button
                  type="button"
                  className="warning-popup-close-btn"
                  onClick={() => setTimeWarningPopup(prev => ({ ...prev, show: false }))}
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>
              <p className="warning-popup-message">
                Only <strong>5 minutes remaining</strong>. Please complete and submit your answers.
              </p>
              <div className="warning-popup-footer">
                <span className="warning-round-badge">
                  {timeWarningPopup.roundName || `Round ${activeRoundIdx + 1}`}
                </span>
                <span className="warning-dismiss-hint">Auto-dismissing in a few seconds...</span>
              </div>
            </div>
          )}

          {/* AUTO ADVANCE / SUBMIT NOTIFICATION TOAST */}
          {autoSubmitToast && (
            <div className="auto-submit-banner">
              <span className="auto-submit-icon">⏰</span>
              <span>{autoSubmitToast}</span>
            </div>
          )}

          {/* ACTIVE 4-ROUND ASSESSMENT RUNNER */}
          {assessmentActive && assessmentRounds.length > 0 ? (
            <div className="multi-round-runner-card">
              {/* HEADER WITH 4 ROUND TABS & PROMINENT COUNTDOWN TIMER */}
              <div className="runner-top-bar">
                <div className="runner-title-area">
                  <span className="badge-tag">Recruitment Assessment • {targetRole}</span>
                  <h2>60-Minute Multi-Round Assessment</h2>
                  <p className="runner-sub">
                    {assessmentRounds[activeRoundIdx]?.name} • {assessmentRounds[activeRoundIdx]?.category}
                  </p>
                </div>

                <div className="runner-timer-group">
                  {/* COUNTDOWN TIMER WITH 5-MINUTE WARNING PULSE */}
                  <div className={`countdown-timer-box ${roundTimeLeft <= 300 ? 'timer-alert-pulse' : ''}`}>
                    <span className="timer-icon">⏱</span>
                    <div className="timer-text-col">
                      <span className="timer-digits">{formatTimer(roundTimeLeft)}</span>
                      <span className="timer-label">
                        {roundTimeLeft <= 300 ? '⚠️ < 5 MINS LEFT' : 'TIME REMAINING'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary exit-test-btn"
                    onClick={handleCancelAssessment}
                  >
                    Exit Test ✕
                  </button>
                </div>
              </div>

              {/* 4 ROUND STEPPER TABS */}
              <div className="multi-round-stepper">
                {assessmentRounds.map((rnd, rIdx) => {
                  const isActive = rIdx === activeRoundIdx
                  const isCompleted = rIdx < activeRoundIdx
                  const isUpcoming = rIdx > activeRoundIdx
                  const answeredCount = rnd.type === 'mcq'
                    ? Object.keys(roundAnswers[rnd.id] || {}).length
                    : Object.keys(codingSolutions).length

                  return (
                    <div
                      key={rnd.id || rIdx}
                      className={`round-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                    >
                      <div className="step-num-bubble">
                        {isCompleted ? '✓' : rIdx + 1}
                      </div>
                      <div className="step-info-col">
                        <span className="step-title">{rnd.name}</span>
                        <span className="step-meta">
                          {rnd.duration_minutes} Mins • {rnd.questions?.length || (rnd.type === 'coding' ? 2 : 10)} {rnd.type === 'coding' ? 'Challenges' : 'Questions'}
                        </span>
                      </div>
                      {isActive && (
                        <span className="step-status-tag">In Progress</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ACTIVE ROUND CONTENT */}
              {(() => {
                const currentRound = assessmentRounds[activeRoundIdx]
                if (!currentRound) return null

                // ----------------------------------------------------
                // ROUND 4: CODING ROUND INTERFACE (2 Problems • 30 Mins)
                // ----------------------------------------------------
                if (currentRound.type === 'coding') {
                  const codingQuestions = currentRound.questions || []
                  const activeProblem = codingQuestions[activeQuestionIdx] || codingQuestions[0]
                  if (!activeProblem) return null

                  const currentSolution = codingSolutions[activeProblem.id] || {
                    code: activeProblem.starter_code?.python || '# Write solution here\n',
                    language: 'python'
                  }

                  return (
                    <div className="coding-round-container">
                      {/* CODING PROBLEM SELECTOR TABS */}
                      <div className="coding-problem-tabs">
                        {codingQuestions.map((prob, pIdx) => {
                          const isProbSelected = pIdx === activeQuestionIdx
                          const hasCode = codingSolutions[prob.id]?.code && codingSolutions[prob.id]?.code.trim().length > 30
                          return (
                            <button
                              key={prob.id || pIdx}
                              type="button"
                              className={`coding-prob-tab ${isProbSelected ? 'active' : ''}`}
                              onClick={() => {
                                setActiveQuestionIdx(pIdx)
                                setCodingRunResult(null)
                              }}
                            >
                              <span>Problem {pIdx + 1}: {prob.title}</span>
                              <span className={`prob-status-dot ${hasCode ? 'solved' : ''}`} />
                            </button>
                          )
                        })}
                      </div>

                      {/* SPLIT SCREEN WORKSPACE: PROBLEM DETAILS + CODE EDITOR */}
                      <div className="coding-workspace-grid">
                        {/* LEFT: PROBLEM SPECIFICATION */}
                        <div className="coding-problem-panel">
                          <div className="prob-header-row">
                            <h3>{activeProblem.title}</h3>
                            <span className={`diff-badge diff-${(activeProblem.difficulty || 'medium').toLowerCase()}`}>
                              {activeProblem.difficulty || 'Medium'}
                            </span>
                          </div>

                          <div className="prob-description-text">
                            <p>{activeProblem.description}</p>
                          </div>

                          {activeProblem.sample_input && (
                            <div className="prob-sample-box">
                              <span className="sample-label">Sample Input:</span>
                              <code>{activeProblem.sample_input}</code>
                            </div>
                          )}

                          {activeProblem.sample_output && (
                            <div className="prob-sample-box">
                              <span className="sample-label">Sample Output:</span>
                              <code>{activeProblem.sample_output}</code>
                            </div>
                          )}

                          {activeProblem.constraints && (
                            <div className="prob-constraints-box">
                              <span className="sample-label">Constraints:</span>
                              <p>{activeProblem.constraints}</p>
                            </div>
                          )}
                        </div>

                        {/* RIGHT: CODE EDITOR & REAL-TIME TEST RUNNER */}
                        <div className="coding-editor-panel">
                          <div className="editor-controls-bar">
                            <div className="lang-select-group">
                              <label>Language:</label>
                              <select
                                value={currentSolution.language || 'python'}
                                onChange={(e) => handleUpdateCodingCode(activeProblem.id, currentSolution.code, e.target.value)}
                                className="lang-select-dropdown"
                              >
                                <option value="python">Python 3</option>
                                <option value="javascript">JavaScript (Node.js)</option>
                                <option value="sql">SQL Query</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              className="btn-secondary reset-code-btn"
                              onClick={() => {
                                const defaultCode = activeProblem.starter_code?.[currentSolution.language || 'python'] || activeProblem.starter_code?.python || ''
                                handleUpdateCodingCode(activeProblem.id, defaultCode, currentSolution.language)
                              }}
                            >
                              ↺ Reset Starter
                            </button>
                          </div>

                          <div className="editor-textarea-wrapper">
                            <textarea
                              className="code-editor-textarea"
                              value={currentSolution.code}
                              onChange={(e) => handleUpdateCodingCode(activeProblem.id, e.target.value, currentSolution.language)}
                              placeholder="# Write your solution here..."
                              spellCheck="false"
                              rows={15}
                            />
                          </div>

                          {/* RUN TEST CASES BUTTON & TEST RESULTS CONSOLE */}
                          <div className="code-runner-actions">
                            <button
                              type="button"
                              className="btn-primary run-tests-btn"
                              disabled={isRunningCode}
                              onClick={() => handleRunCodingSolution(activeProblem.id)}
                            >
                              {isRunningCode ? '⏳ Running Test Cases...' : '▶ Run Test Cases'}
                            </button>
                          </div>

                          {codingRunResult && (
                            <div className={`coding-console-box ${codingRunResult.all_passed ? 'passed' : 'failed'}`}>
                              <div className="console-header">
                                <strong>Execution Output:</strong>
                                <span className={`console-badge ${codingRunResult.all_passed ? 'badge-pass' : 'badge-fail'}`}>
                                  {codingRunResult.all_passed ? '✓ All Test Cases Passed' : '✗ Tests Incomplete'}
                                </span>
                              </div>
                              <p className="console-msg">{codingRunResult.message || codingRunResult.error}</p>

                              {(codingRunResult.test_results || []).map((t, tidx) => (
                                <div key={tidx} className="test-case-row">
                                  <span className={`test-status ${t.passed ? 'pass' : 'fail'}`}>
                                    {t.passed ? '✓ Test Case ' + (tidx + 1) + ' Passed' : '✗ Test Case ' + (tidx + 1) + ' Failed'}
                                  </span>
                                  {t.input && <span className="test-meta-info">Input: {t.input}</span>}
                                  {t.output && <span className="test-meta-info">Output: {t.output}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CODING FOOTER CONTROLS */}
                      <div className="quiz-footer-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={activeQuestionIdx === 0}
                          onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                        >
                          ← Previous Problem
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          {activeQuestionIdx < codingQuestions.length - 1 ? (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => {
                                setActiveQuestionIdx(prev => Math.min(codingQuestions.length - 1, prev + 1))
                                setCodingRunResult(null)
                              }}
                            >
                              Next Problem →
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary submit-final-btn"
                              disabled={assessmentLoading}
                              onClick={() => handleSubmitAllRounds(false)}
                            >
                              {assessmentLoading ? 'Submitting Assessment...' : 'Finish Assessment & Submit ✓'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                // ----------------------------------------------------
                // MCQ ROUNDS INTERFACE (Round 1: Aptitude, Round 2: Technical, Round 3: Verbal)
                // ----------------------------------------------------
                const roundQuestions = currentRound.questions || []
                const q = roundQuestions[activeQuestionIdx]
                if (!q) return null

                const qid = q.id || q.question_id || activeQuestionIdx
                const currentRoundAns = roundAnswers[currentRound.id] || {}
                const selectedOpt = currentRoundAns[qid]
                const isFinalRound = activeRoundIdx === assessmentRounds.length - 1

                return (
                  <div className="mcq-round-container">
                    <div className="question-card">
                      <div className="question-card-top">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="question-num">
                            Question {activeQuestionIdx + 1} of {roundQuestions.length}
                          </span>
                          <span className="cat-badge">{q.category || currentRound.name}</span>
                          {q.topic && <span className="topic-badge">{q.topic}</span>}
                        </div>
                        <span className={`diff-badge diff-${(q.difficulty || 'medium').toLowerCase()}`}>
                          {q.difficulty || 'Medium'}
                        </span>
                      </div>

                      <h3 className="question-text">{q.question}</h3>

                      <div className="options-grid">
                        {(q.options || []).map((optText, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx)
                          const isSelected = selectedOpt === optIdx
                          return (
                            <div
                              key={optIdx}
                              className={`option-box ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectRoundAnswer(currentRound.id, qid, optIdx)}
                            >
                              <span className="option-letter">{letter}</span>
                              <span className="option-text">{optText}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* QUESTION QUICK SELECTOR PILLS */}
                    <div className="diag-question-nav-pills">
                      {roundQuestions.map((item, idx) => {
                        const itemQid = item.id || item.question_id || idx
                        const isAnswered = currentRoundAns[itemQid] !== undefined
                        const isCurrent = idx === activeQuestionIdx
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`diag-pill-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                            onClick={() => setActiveQuestionIdx(idx)}
                          >
                            {idx + 1}
                          </button>
                        )
                      })}
                    </div>

                    {/* NAVIGATION & ADVANCE ROUND ACTIONS */}
                    <div className="quiz-footer-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={activeQuestionIdx === 0}
                        onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                      >
                        ← Previous
                      </button>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {activeQuestionIdx < roundQuestions.length - 1 ? (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setActiveQuestionIdx(prev => Math.min(roundQuestions.length - 1, prev + 1))}
                          >
                            Next Question →
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary advance-round-btn"
                            onClick={handleAdvanceToNextRoundManual}
                          >
                            {isFinalRound ? 'Finish Assessment & Submit ✓' : `Submit Round ${activeRoundIdx + 1} & Next Round →`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            /* TWO-COLUMN 60-MINUTE ASSESSMENT SETUP & RESULTS OVERVIEW */
            <div>
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <span className="badge-tag">Assessment Center</span>
                  <h1>60-Minute Multi-Round Recruitment Assessment</h1>
                  <p>Comprehensive 4-round evaluation covering Aptitude, Technical Skills, Verbal Ability, and Hands-on Coding.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isRefreshing}
                    onClick={() => user?.id && loadAllUserData(user.id, token)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>{isRefreshing ? '↻ Syncing...' : '↻ Refresh'}</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => navigateTo('skills')}>
                    View Skill Gap Analysis →
                  </button>
                </div>
              </div>

              <div className="assessment-two-col">
                {/* LEFT COLUMN: 4-ROUND ASSESSMENT LAUNCHER */}
                <div className="diag-card-column left-col">
                  <div className="diag-card-inner">
                    <div className="diag-card-header">
                      <span className="badge-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                        Recruitment Assessment
                      </span>
                      <h2>Recruitment Assessment & Practice Test</h2>
                      <p className="diag-card-sub">
                        4-round timed recruitment test: Aptitude (10m), Technical (10m), Verbal Ability (10m), and Coding (30m). Total 32 questions, 60 minutes.
                      </p>
                    </div>

                    {/* TARGET ROLE & PRIMARY SKILL SELECTOR */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: '700', color: '#cbd5e1', fontSize: '13px' }}>Target Role:</label>
                        <select
                          value={targetRole}
                          onChange={(e) => handleTargetRoleChange(e.target.value)}
                          className="role-selector-input"
                        >
                          {TARGET_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontWeight: '700', color: '#cbd5e1', fontSize: '13px' }}>Technical & Coding Skill:</label>
                        <input
                          type="text"
                          placeholder="e.g. Python, Java, SQL, React..."
                          value={assessmentSkill || (selectedAssessmentSkills[0] || 'Python')}
                          onChange={(e) => {
                            setAssessmentSkill(e.target.value)
                            if (e.target.value.trim()) {
                              setSelectedAssessmentSkills([e.target.value.trim()])
                            }
                          }}
                          className="role-selector-input"
                          style={{ background: '#090d16', color: '#f8fafc' }}
                        />
                      </div>
                    </div>

                    {/* POPULAR SKILL PILLS FOR QUICK SELECTION */}
                    <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                        Select Skill to Test:
                      </span>
                      <div className="skills-chip-cloud" style={{ maxHeight: '90px', overflowY: 'auto' }}>
                        {['Python', 'Java', 'SQL', 'JavaScript', 'C++', 'React', 'HTML', 'CSS', 'Node.js', 'Data Structures', 'DBMS', 'Algorithms'].map((sk) => {
                          const currentSkill = (assessmentSkill || selectedAssessmentSkills[0] || 'Python').toLowerCase()
                          const isSelected = currentSkill === sk.toLowerCase()
                          return (
                            <button
                              key={sk}
                              type="button"
                              className={`skill-select-chip ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setAssessmentSkill(sk)
                                setSelectedAssessmentSkills([sk])
                              }}
                            >
                              {isSelected ? `✓ ${sk}` : sk}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 4 ROUNDS BREAKDOWN */}
                    <div className="diag-categories-list">
                      <div className="diag-cat-item">
                        <div className="diag-cat-icon">🧮</div>
                        <div className="diag-cat-content">
                          <strong>Round 1 – Aptitude (10 Questions • 10 Minutes)</strong>
                          <p>Quantitative aptitude, logical reasoning, percentages, ratios, number series, problem solving. Countdown timer with auto-submit.</p>
                        </div>
                      </div>

                      <div className="diag-cat-item">
                        <div className="diag-cat-icon">💻</div>
                        <div className="diag-cat-content">
                          <strong>Round 2 – Technical Skills ({assessmentSkill || selectedAssessmentSkills[0] || 'Python'}) (10 Questions • 10 Minutes)</strong>
                          <p>Technical MCQs customized to your selected skill. Countdown timer with auto-submit.</p>
                        </div>
                      </div>

                      <div className="diag-cat-item">
                        <div className="diag-cat-icon">💬</div>
                        <div className="diag-cat-content">
                          <strong>Round 3 – Verbal Ability (10 Questions • 10 Minutes)</strong>
                          <p>Grammar, vocabulary, sentence correction, synonyms, antonyms, comprehension, sentence arrangement. Countdown timer with auto-submit.</p>
                        </div>
                      </div>

                      <div className="diag-cat-item">
                        <div className="diag-cat-icon">⚡</div>
                        <div className="diag-cat-content">
                          <strong>Round 4 – Coding ({assessmentSkill || selectedAssessmentSkills[0] || 'Python'}) (2 Problems • 30 Minutes)</strong>
                          <p>2 coding problems customized to your selected skill with interactive code editor and test runner. Countdown timer with auto-submit.</p>
                        </div>
                      </div>
                    </div>

                    {/* RESUME SKILLS FOCUS CHIPS (IF UPLOADED) */}
                    {resumeData?.skills && resumeData.skills.length > 0 && (
                      <div className="resume-skills-selector-box" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                            Skills from Your Resume:
                          </span>
                          <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                            {resumeData.skills.length} extracted
                          </span>
                        </div>
                        <div className="skills-chip-cloud">
                          {resumeData.skills.map((sk) => {
                            const isSelected = (assessmentSkill || selectedAssessmentSkills[0] || '').toLowerCase() === sk.toLowerCase()
                            return (
                              <button
                                key={sk}
                                type="button"
                                className={`skill-select-chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setAssessmentSkill(sk)
                                  setSelectedAssessmentSkills([sk])
                                }}
                              >
                                {isSelected ? `✓ ${sk}` : `+ ${sk}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* TIMING SUMMARY ROW */}
                    <div className="diag-test-info-row">
                      <span>⏱ <strong>60 Minutes</strong> Duration</span>
                      <span>📝 <strong>32 Total</strong> Questions (4 Rounds)</span>
                      <span>⚖️ <strong>70%</strong> Readiness Score</span>
                    </div>

                    <button
                      type="button"
                      className="btn-primary start-diag-btn"
                      disabled={assessmentLoading}
                      onClick={() => handleStartMultiRoundAssessment(assessmentSkill || selectedAssessmentSkills[0] || 'Python')}
                    >
                      {assessmentLoading ? 'Preparing Recruitment Assessment...' : (diagnosticResult?.has_taken ? '↻ Retake Recruitment Assessment' : '▶ Start Recruitment Assessment')}
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: ASSESSMENT RESULTS & SUGGESTIONS */}
                <div className="diag-card-column right-col">
                  <div className="diag-card-inner">
                    <div className="diag-card-header">
                      <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        Assessment Results
                      </span>
                      <h2>Overall Recruitment Result</h2>
                      <p className="diag-card-sub">Individual round scores, strengths, and targeted areas to improve for {diagnosticResult?.skill || assessmentSkill || 'Selected Skill'}.</p>
                    </div>

                    {diagnosticResult?.has_taken ? (
                      <div>
                        {/* OVERALL SCORE HERO */}
                        <div className="diag-score-hero">
                          <div className="diag-score-big">
                            <span className="diag-score-val">{diagnosticResult.overall_score || diagnosticResult.score || 0}%</span>
                            <span className="diag-score-lbl">Overall Assessment Score</span>
                          </div>
                          <div className="diag-score-meta">
                            <span className={`diag-level-badge ${(diagnosticResult.skill_level || diagnosticResult.level || 'Proficient').toLowerCase()}`}>
                              {diagnosticResult.skill_level || diagnosticResult.level || 'Proficient'} Level
                            </span>
                            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                              Skill Tested: <strong style={{ color: '#f8fafc' }}>{diagnosticResult.skill || assessmentSkill || 'Python'}</strong>
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              Status: <strong style={{ color: (diagnosticResult.overall_score || diagnosticResult.score || 0) >= 50 ? '#34d399' : '#f59e0b' }}>{diagnosticResult.status || ((diagnosticResult.overall_score || diagnosticResult.score || 0) >= 50 ? 'Passed' : 'Needs Practice')}</strong>
                            </span>
                          </div>
                        </div>

                        {/* 4 ROUND PROGRESS BARS */}
                        <div className="diag-category-bars-container">
                          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#cbd5e1' }}>4 Round Scores Breakdown</h4>

                          <div className="diag-cat-bar-item">
                            <div className="diag-bar-label-row">
                              <span>Round 1 – Aptitude Score (10 Qs • 10 min)</span>
                              <strong>{diagnosticResult.round_scores?.round1_aptitude?.score ?? diagnosticResult.aptitude_score ?? 0}%</strong>
                            </div>
                            <div className="comp-bar-track">
                              <div
                                className="comp-bar-fill"
                                style={{ width: `${diagnosticResult.round_scores?.round1_aptitude?.score ?? diagnosticResult.aptitude_score ?? 0}%`, background: '#38bdf8' }}
                              />
                            </div>
                          </div>

                          <div className="diag-cat-bar-item">
                            <div className="diag-bar-label-row">
                              <span>Round 2 – Technical Score ({diagnosticResult.skill || assessmentSkill || 'Technical'}) (10 Qs • 10 min)</span>
                              <strong>{diagnosticResult.round_scores?.round2_technical?.score ?? diagnosticResult.technical_score ?? 0}%</strong>
                            </div>
                            <div className="comp-bar-track">
                              <div
                                className="comp-bar-fill"
                                style={{ width: `${diagnosticResult.round_scores?.round2_technical?.score ?? diagnosticResult.technical_score ?? 0}%`, background: '#6366f1' }}
                              />
                            </div>
                          </div>

                          <div className="diag-cat-bar-item">
                            <div className="diag-bar-label-row">
                              <span>Round 3 – Verbal Ability Score (10 Qs • 10 min)</span>
                              <strong>{diagnosticResult.round_scores?.round3_verbal?.score ?? diagnosticResult.verbal_score ?? 0}%</strong>
                            </div>
                            <div className="comp-bar-track">
                              <div
                                className="comp-bar-fill"
                                style={{ width: `${diagnosticResult.round_scores?.round3_verbal?.score ?? diagnosticResult.verbal_score ?? 0}%`, background: '#10b981' }}
                              />
                            </div>
                          </div>

                          <div className="diag-cat-bar-item">
                            <div className="diag-bar-label-row">
                              <span>Round 4 – Coding Score ({diagnosticResult.skill || assessmentSkill || 'Coding'}) (2 Problems • 30 min)</span>
                              <strong>{diagnosticResult.round_scores?.round4_coding?.score ?? diagnosticResult.coding_score ?? 0}%</strong>
                            </div>
                            <div className="comp-bar-track">
                              <div
                                className="comp-bar-fill"
                                style={{ width: `${diagnosticResult.round_scores?.round4_coding?.score ?? diagnosticResult.coding_score ?? 0}%`, background: '#f59e0b' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* STRENGTHS SECTION */}
                        <div className="where-to-improve-box" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: '14px' }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💪 Strengths:</span>
                          </h4>
                          <ul className="improve-suggestions-list">
                            {(diagnosticResult.strengths || [
                              `Strong foundation in ${diagnosticResult.skill || 'technical domain'} fundamentals and problem solving.`,
                              'Completed full recruitment assessment across all 4 rounds under timed constraints.'
                            ]).map((str, sidx) => (
                              <li key={sidx} style={{ color: '#e2e8f0' }}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        {/* AREAS TO IMPROVE SECTION */}
                        <div className="where-to-improve-box">
                          <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💡 Areas to Improve:</span>
                          </h4>
                          <ul className="improve-suggestions-list">
                            {(diagnosticResult.areas_to_improve || diagnosticResult.where_to_improve || [
                              'Practice quantitative problem-solving formulas and speed-distance calculations.',
                              'Review technical edge-cases and time complexity optimizations in coding problems.',
                              'Strengthen sentence correction and grammar rules in verbal ability.'
                            ]).map((sug, sidx) => (
                              <li key={sidx}>{sug}</li>
                            ))}
                          </ul>
                        </div>

                        {/* OFFICIAL VERIXA CERTIFICATE BANNER FOR JOBS & INTERNSHIPS */}
                        <div className="verixa-cert-banner animate-fade-in" style={{ marginTop: '16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(56, 189, 248, 0.12))', border: '1px solid rgba(99, 102, 241, 0.45)', borderRadius: '14px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '18px' }}>🎓</span>
                              <strong style={{ color: '#ffffff', fontSize: '15px' }}>Official VERIXA Verified Skill Certificate</strong>
                              <span style={{ background: '#10b98133', color: '#34d399', border: '1px solid #10b981', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>VERIFIED</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                              Credential ID: <strong style={{ color: '#38bdf8' }}>{diagnosticResult.certificate_id || diagnosticResult.certificate?.id || `VRX-2026-${(diagnosticResult.skill || 'JAVA').toUpperCase()}-${diagnosticResult.assessment_id || 101}`}</strong> • Use for verified internship & job recruitment applications.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            onClick={() => setShowCertificateModal(true)}
                          >
                            <span>🏆</span>
                            <span>View & Download Certificate</span>
                          </button>
                        </div>

                        {/* VIEW QUESTION & CODING REVIEW BUTTON */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ flex: 1 }}
                            onClick={() => setShowReviewModal(true)}
                          >
                            📋 View Detailed Review
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigateTo('skills')}
                          >
                            Skill Matrix →
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* PLACEHOLDER BEFORE TAKING TEST */
                      <div className="diag-empty-results">
                        <div className="empty-results-icon">🎯</div>
                        <h3>No Assessment Results Yet</h3>
                        <p>Take the 60-minute recruitment test on the left to evaluate your Aptitude, Technical Skills, Verbal Ability, and Coding performance.</p>
                        <div className="diag-perks-list">
                          <div>✓ Round 1: Aptitude (10 Qs, 10 Mins)</div>
                          <div>✓ Round 2: Technical Skills for selected skill (10 Qs, 10 Mins)</div>
                          <div>✓ Round 3: Verbal Ability (10 Qs, 10 Mins)</div>
                          <div>✓ Round 4: Coding for selected skill (2 Problems, 30 Mins)</div>
                          <div>✓ Total: 32 Questions, 60 Minutes</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETAILED QUESTION & CODING REVIEW MODAL */}
          {showReviewModal && (
            <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
              <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="review-modal-header">
                  <div>
                    <span className="badge-tag">Assessment Review</span>
                    <h2>Detailed Assessment Review</h2>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                      Overall Score: <strong style={{ color: '#38bdf8' }}>{diagnosticResult?.overall_score || diagnosticResult?.score}%</strong> ({diagnosticResult?.skill_level || diagnosticResult?.level}) • Target Role: {diagnosticResult?.target_role || targetRole}
                    </p>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={() => setShowReviewModal(false)}>✕</button>
                </div>

                <div className="review-questions-list">
                  {/* MCQ REVIEWS */}
                  {(diagnosticResult?.question_reviews || diagnosticResult?.review_data || []).map((item, idx) => (
                    <div key={idx} className={`review-item-card ${item.is_correct ? 'correct' : 'incorrect'}`}>
                      <div className="review-item-top">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="review-num">Round {item.round || 1}: Question {idx + 1}</span>
                          <span className="cat-badge">{item.round_name || item.category || 'General'}</span>
                        </div>
                        <span className={`review-status-pill ${item.is_correct ? 'correct' : 'incorrect'}`}>
                          {item.is_correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>

                      <h4 className="review-question-text">{item.question}</h4>

                      <div className="review-answers-grid">
                        <div className={`review-answer-box ${item.is_correct ? 'user-correct' : 'user-incorrect'}`}>
                          <span className="ans-label">Your Answer:</span>
                          <span className="ans-text">{item.selected_answer || item.user_answer || 'Not Answered'}</span>
                        </div>

                        {!item.is_correct && (
                          <div className="review-answer-box correct-ans-box">
                            <span className="ans-label">Correct Answer:</span>
                            <span className="ans-text">{item.correct_answer}</span>
                          </div>
                        )}
                      </div>

                      {item.explanation && (
                        <div className="review-explanation">
                          <strong>Explanation:</strong> {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* CODING REVIEWS */}
                  {(diagnosticResult?.coding_reviews || []).map((cRev, cidx) => (
                    <div key={`code_${cidx}`} className="review-item-card coding-rev-card">
                      <div className="review-item-top">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="review-num">Round 4: Challenge {cidx + 1}</span>
                          <span className="cat-badge">Coding Challenge</span>
                        </div>
                        <span className={`review-status-pill ${cRev.score >= 70 ? 'correct' : 'incorrect'}`}>
                          {cRev.status || (cRev.score >= 70 ? '✓ Accepted' : 'Partial / Solved')} ({cRev.score}%)
                        </span>
                      </div>

                      <h4 className="review-question-text">{cRev.title}</h4>
                      {cRev.submitted_code && (
                        <div className="submitted-code-preview">
                          <pre><code>{cRev.submitted_code}</code></pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #1e293b', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-primary" onClick={() => setShowReviewModal(false)}>
                    Close Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OFFICIAL VERIXA CERTIFICATE MODAL (PRINTABLE & DOWNLOADABLE) */}
          {showCertificateModal && (activeAssessmentCert || diagnosticResult) && (() => {
            const activeCert = activeAssessmentCert || diagnosticResult
            const certSkill = activeCert.skill || activeCert.skill_name || assessmentSkill || 'Technical Skill'
            const certId = activeCert.certificate_id || activeCert.credential_id || activeCert.certificate?.id || `VRX-2026-${certSkill.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${activeCert.assessment_id || 101}`
            const certScore = activeCert.overall_score || activeCert.score || 0
            const certLevel = activeCert.skill_level || activeCert.level || 'Advanced'
            const certDate = activeCert.assessment_date || activeCert.issue_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            const rScores = activeCert.round_scores || diagnosticResult?.round_scores || {}

            return (
              <div className="modal-overlay" onClick={() => setShowCertificateModal(false)}>
                <div className="certificate-modal-box" onClick={(e) => e.stopPropagation()}>
                  <div className="cert-modal-top-actions">
                    <span className="badge-tag" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                      Authentic VERIXA Credential
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => window.print()}
                      >
                        🖨️ Print / Save PDF
                      </button>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => setShowCertificateModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* THE OFFICIAL CERTIFICATE SHEET */}
                  <div className="verixa-certificate-sheet" id="verixa-printable-certificate">
                    <div className="cert-inner-frame">
                      <div className="cert-corner-ornament top-left" />
                      <div className="cert-corner-ornament top-right" />
                      <div className="cert-corner-ornament bottom-left" />
                      <div className="cert-corner-ornament bottom-right" />

                      {/* CERTIFICATE HEADER */}
                      <div className="cert-header">
                        <div className="cert-brand-logo">
                          <span>VERI</span><span className="brand-accent">XA</span>
                        </div>
                        <div className="cert-authority-title">
                          VERIXA TALENT VERIFICATION AUTHORITY
                        </div>
                        <h1 className="cert-main-title">
                          CERTIFICATE OF VERIFIED TALENT
                        </h1>
                        <div className="cert-sub-heading">
                          RECRUITMENT & MULTI-ROUND TECHNICAL ASSESSMENT
                        </div>
                      </div>

                      <div className="cert-divider-line" />

                      {/* RECIPIENT */}
                      <div className="cert-body">
                        <p className="cert-intro">This is to certify that</p>
                        <h2 className="cert-recipient-name">
                          {activeCert.recipient_name || user?.name || user?.email || 'Student Candidate'}
                        </h2>
                        <p className="cert-statement">
                          has successfully completed the comprehensive 60-Minute 4-Round Assessment in{' '}
                          <strong>{certSkill.toUpperCase()}</strong>{' '}
                          and demonstrated verified competency for internships and professional employment.
                        </p>

                        {/* 4-ROUND TRANSCRIPT TABLE */}
                        <div className="cert-transcript-box">
                          <div className="cert-transcript-item">
                            <span className="transcript-lbl">Round 1: Aptitude</span>
                            <strong className="transcript-val">
                              {rScores.round1_aptitude?.score ?? activeCert.aptitude_score ?? 80}%
                            </strong>
                          </div>
                          <div className="cert-transcript-item">
                            <span className="transcript-lbl">Round 2: Technical ({certSkill})</span>
                            <strong className="transcript-val">
                              {rScores.round2_technical?.score ?? activeCert.technical_score ?? 85}%
                            </strong>
                          </div>
                          <div className="cert-transcript-item">
                            <span className="transcript-lbl">Round 3: Verbal Ability</span>
                            <strong className="transcript-val">
                              {rScores.round3_verbal?.score ?? activeCert.verbal_score ?? 75}%
                            </strong>
                          </div>
                          <div className="cert-transcript-item">
                            <span className="transcript-lbl">Round 4: Coding</span>
                            <strong className="transcript-val">
                              {rScores.round4_coding?.score ?? activeCert.coding_score ?? 80}%
                            </strong>
                          </div>
                        </div>

                        {/* SCORE & LEVEL STAMP */}
                        <div className="cert-score-highlight">
                          <div className="cert-score-bubble">
                            <span className="bubble-num">{certScore}%</span>
                            <span className="bubble-lbl">Overall Verified Score</span>
                          </div>
                          <div className="cert-level-bubble">
                            <span className="bubble-level">{certLevel}</span>
                            <span className="bubble-lbl">Proficiency Status</span>
                          </div>
                        </div>
                      </div>

                      {/* CERTIFICATE FOOTER WITH QR & ID */}
                      <div className="cert-footer">
                        <div className="cert-footer-col">
                          <div className="cert-meta-item">
                            <span className="cert-meta-lbl">Credential ID:</span>
                            <strong className="cert-meta-val">{certId}</strong>
                          </div>
                          <div className="cert-meta-item">
                            <span className="cert-meta-lbl">Issue Date:</span>
                            <strong className="cert-meta-val">{certDate}</strong>
                          </div>
                        </div>

                        <div className="cert-security-seal">
                          <div className="seal-circle">
                            <span>VERIFIED</span>
                            <div className="seal-star">★ ★ ★</div>
                            <span className="seal-authority">VERIXA SECURE</span>
                          </div>
                        </div>

                        <div className="cert-footer-col right-align">
                          <div className="cert-signature-line" />
                          <span className="cert-sign-title">Academic & Industry Verification Board</span>
                          <span className="cert-sign-sub">VERIXA Verified Talent Ecosystem</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="cert-modal-bottom-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setShowCertificateModal(false)
                        navigateTo('jobs')
                      }}
                    >
                      💼 Find Matching Jobs & Internships with this Certificate →
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowCertificateModal(false)
                        navigateTo('verification')
                      }}
                    >
                      📁 View in Verification Center
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* =====================================================
          PAGE: VERIFICATION CENTER (MODULES + PROJECTS)
      ===================================================== */}
      {page === 'verification' && user && (
        <div className="app-container">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span className="badge-tag">Verification Center</span>
              <h1>Career Credential Verification</h1>
              <p>Verify your resume, certificates, and practical projects to power your transparent career readiness profile.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                disabled={isRefreshing}
                onClick={() => user?.id && loadAllUserData(user.id, token)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{isRefreshing ? '↻ Syncing...' : '↻ Refresh Status'}</span>
              </button>
              <button className="btn-primary" onClick={() => navigateTo('assessment')}>
                Take Diagnostic Assessment (70%) →
              </button>
            </div>
          </div>

          {/* COMPOSITE FINAL CAREER SCORE CALCULATION CARD */}
          <div className="readiness-banner-card animate-slide-up" style={{ marginBottom: '25px' }}>
            <div className="readiness-banner-left">
              <span className="readiness-label">Composite Final Career Readiness Score</span>
              <div className="readiness-score-display">
                <span className="big-score" style={{ color: '#38bdf8' }}>
                  {careerScore?.overall_score ?? (diagnosticResult?.overall_score ? Math.round(diagnosticResult.overall_score * 0.7) : 0)}
                </span>
                <span className="score-max">/ 100</span>
                <span className={`readiness-status-badge ${(careerScore?.status || 'Needs Verification').toLowerCase().replace(/\s+/g, '-')}`}>
                  {careerScore?.status || 'In Progress'}
                </span>
              </div>
              <p className="readiness-formula-note" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>Formula:</strong> Final Score = (Assessment × 70%) + (Resume × 10%) + (Certificates × 10%) + (Projects × 10%)
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                {careerScore?.message || 'Final score updates automatically as you complete assessments, verify documents, and build projects.'}
              </div>
            </div>

            <div className="readiness-components-breakdown">
              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>🎯 Assessment (70% weight)</span>
                  <strong style={{ fontSize: '12px' }}>
                    {careerScore?.breakdown?.assessment?.score ?? (diagnosticResult?.overall_score ?? 0)}% → {careerScore?.breakdown?.assessment?.contribution ?? (((careerScore?.breakdown?.assessment?.score ?? (diagnosticResult?.overall_score ?? 0))) * 0.7).toFixed(1)} pts
                  </strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.assessment?.score ?? (diagnosticResult?.overall_score ?? 0)}%`, background: '#6366f1' }} />
                </div>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>📄 Resume Analysis (10% weight)</span>
                  <strong style={{ fontSize: '12px' }}>
                    {careerScore?.breakdown?.resume?.score ?? (resumeData?.resume_score ?? 0)}% → {careerScore?.breakdown?.resume?.contribution ?? (((careerScore?.breakdown?.resume?.score ?? (resumeData?.resume_score ?? 0))) * 0.1).toFixed(1)} pts
                  </strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.resume?.score ?? (resumeData?.resume_score ?? 0)}%`, background: '#10b981' }} />
                </div>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>🏆 Certificates (10% weight)</span>
                  <strong style={{ fontSize: '12px' }}>
                    {careerScore?.breakdown?.certificates?.score ?? (certificatesList.length > 0 ? 100 : 0)}% → {careerScore?.breakdown?.certificates?.contribution ?? (((careerScore?.breakdown?.certificates?.score ?? (certificatesList.length > 0 ? 100 : 0))) * 0.1).toFixed(1)} pts
                  </strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.certificates?.score ?? (certificatesList.length > 0 ? 100 : 0)}%`, background: '#f59e0b' }} />
                </div>
              </div>

              <div className="readiness-comp">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>💻 Practical Projects (10% weight)</span>
                  <strong style={{ fontSize: '12px' }}>
                    {careerScore?.breakdown?.projects?.score ?? (userProjects.length > 0 ? 100 : 0)}% → {careerScore?.breakdown?.projects?.contribution ?? (((careerScore?.breakdown?.projects?.score ?? (userProjects.length > 0 ? 100 : 0))) * 0.1).toFixed(1)} pts
                  </strong>
                </div>
                <div className="comp-bar-track">
                  <div className="comp-bar-fill" style={{ width: `${careerScore?.breakdown?.projects?.score ?? (userProjects.length > 0 ? 100 : 0)}%`, background: '#ec4899' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="verification-modules-grid">
            {/* MODULE 1: RESUME VERIFICATION */}
            <div className="verif-module-card">
              <div className="module-header">
                <div className="module-badge">Module 1 (10%)</div>
                <h2>Resume Verification & Analysis</h2>
              </div>
              <p className="module-desc">
                Upload your resume (PDF, DOC, DOCX, TXT) for structural section detection, scoring, and technical skill extraction.
              </p>

              <form onSubmit={handleResumeUpload} className="upload-form-box">
                <input
                  type="file"
                  id="resume-file-input"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  style={{ color: '#cbd5e1' }}
                />
                {resumeFile && (
                  <div style={{ fontSize: '13px', color: '#38bdf8' }}>
                    Selected: <strong>{resumeFile.name}</strong> ({(resumeFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={resumeUploading || !resumeFile}>
                  {resumeUploading ? 'Analyzing Resume...' : (resumeFile ? 'Upload & Analyze Resume' : 'Select Resume to Upload')}
                </button>
              </form>

              {/* LIST OF UPLOADED RESUME CARDS */}
              <div className="uploaded-resumes-container" style={{ marginTop: '16px' }}>
                {resumeList && resumeList.length > 0 ? (
                  resumeList.map((resItem) => {
                    const ext = (resItem.filename || '').split('.').pop()?.toUpperCase() || (resItem.file_type || 'PDF').toUpperCase();
                    const docTypeLabel = `${ext} Document`;
                    const isBest = resItem.is_best_score;
                    const isDeleting = deletingResumeId === resItem.id;

                    return (
                      <div key={resItem.id} className="resume-card-box">
                        <div className="resume-card-main">
                          <div className="resume-header-row">
                            <div className="resume-icon">📄</div>
                            <div className="resume-title-wrap">
                              <h4 className="resume-title-text">{resItem.filename || 'resume.pdf'}</h4>
                              <div className="resume-sub-status">Resume Uploaded Successfully</div>
                            </div>
                            {isBest && (
                              <div className="resume-active-badge">
                                Active Score ({resItem.resume_score}/100)
                              </div>
                            )}
                          </div>

                          <div className="resume-checkmarks-list">
                            <div className="resume-check-line">
                              <span className="green-check">✓</span>
                              <span>{docTypeLabel}</span>
                            </div>
                            <div className="resume-check-line">
                              <span className="green-check">✓</span>
                              <span>
                                Resume Analysis Completed ({resItem.resume_score || 0}/100 - {resItem.status || 'Verified'})
                              </span>
                            </div>
                          </div>

                          {resItem.skills && resItem.skills.length > 0 && (
                            <div className="resume-skills-chips-row">
                              <span className="chips-label">Extracted Skills:</span>
                              <div className="chips-container">
                                {resItem.skills.map((sk, sidx) => (
                                  <span key={sidx} className="skill-mini-chip">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {resItem.missing_sections && resItem.missing_sections.length > 0 && (
                            <div className="resume-missing-row" style={{ color: '#f87171' }}>
                              Missing Sections: {Array.isArray(resItem.missing_sections) ? resItem.missing_sections.join(', ') : resItem.missing_sections}
                            </div>
                          )}

                          <div className="resume-btn-actions">
                            <button
                              type="button"
                              className="resume-action-btn view-btn"
                              onClick={() => handleViewResume(resItem)}
                            >
                              [ View Resume ]
                            </button>
                            <button
                              type="button"
                              className="resume-action-btn remove-btn"
                              disabled={isDeleting}
                              onClick={() => handleRemoveResume(resItem.id)}
                            >
                              {isDeleting ? 'Removing...' : '[ Remove Resume ]'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', background: 'rgba(8, 12, 20, 0.4)', borderRadius: '8px', border: '1px dashed #334155' }}>
                    No resumes uploaded yet. Upload your resume above to extract skills and earn 10% career score contribution.
                  </div>
                )}
              </div>
            </div>

            {/* MODULE 2: CERTIFICATE VERIFICATION */}
            <div className="verif-module-card">
              <div className="module-header">
                <div className="module-badge">Module 2 (10%)</div>
                <h2>Certificate Authenticator</h2>
              </div>
              <p className="module-desc">
                Upload credential certificates (PDF, JPG, PNG) with issuer details for authentication.
              </p>

              <form onSubmit={handleCertUpload} className="upload-form-box">
                <input
                  type="file"
                  id="cert-file-input"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setCertFile(e.target.files[0])}
                  style={{ color: '#cbd5e1' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Issuer (e.g. Coursera, AWS, Google)"
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                  <input
                    type="number"
                    placeholder="Year (e.g. 2024)"
                    value={certYear}
                    onChange={(e) => setCertYear(e.target.value)}
                    style={{ width: '110px', padding: '8px 12px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={certUploading || !certFile}>
                  {certUploading ? 'Verifying...' : 'Upload & Verify Certificate'}
                </button>
              </form>

              {/* CERTIFICATES LIST */}
              <div className="doc-analysis-result">
                {certificatesList && certificatesList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {certificatesList.map((cert) => {
                      const isDeleting = deletingCertId === cert.id;
                      return (
                        <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#f8fafc', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cert.certificate_name || cert.filename}
                            </strong>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                              {cert.issuing_organization || 'Official Issuer'} • {cert.issue_date || 'Recent'}
                              {cert.credential_id && cert.credential_id !== 'Not provided' && (
                                <span> • ID: <code style={{ color: '#38bdf8' }}>{cert.credential_id}</code></span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: cert.verification_status === 'VERIFIED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                              color: cert.verification_status === 'VERIFIED' ? '#34d399' : '#fbbf24',
                              border: cert.verification_status === 'VERIFIED' ? '1px solid #10b981' : '1px solid #f59e0b'
                            }}>
                              {cert.verification_status || 'VERIFIED'}
                            </span>
                            <button
                              type="button"
                              className="resume-action-btn view-btn"
                              style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}
                              onClick={() => {
                                setActiveAssessmentCert({
                                  skill: cert.skill_name || 'Technical Skill',
                                  certificate_id: cert.credential_id || `VRX-2026-${(cert.skill_name || 'SKILL').toUpperCase()}-001`,
                                  overall_score: cert.score || (diagnosticResult?.overall_score ?? 85),
                                  skill_level: cert.verification_status === 'VERIFIED' ? 'Expert' : 'Advanced',
                                  assessment_date: cert.issue_date,
                                  round_scores: diagnosticResult?.round_scores || {
                                    round1_aptitude: { score: diagnosticResult?.aptitude_score ?? 80 },
                                    round2_technical: { score: diagnosticResult?.technical_score ?? 85 },
                                    round3_verbal: { score: diagnosticResult?.verbal_score ?? 75 },
                                    round4_coding: { score: diagnosticResult?.coding_score ?? 80 }
                                  }
                                })
                                setShowCertificateModal(true)
                              }}
                            >
                              [ View Certificate ]
                            </button>
                            <button
                              type="button"
                              className="resume-action-btn remove-btn"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              disabled={isDeleting}
                              onClick={() => handleRemoveCertificate(cert.id)}
                            >
                              {isDeleting ? 'Removing...' : '[ Remove ]'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', background: 'rgba(8, 12, 20, 0.4)', borderRadius: '8px', border: '1px dashed #334155' }}>
                    No certificates uploaded yet. Upload credential certificates above to contribute 10% to your career score.
                  </div>
                )}
              </div>
            </div>

            {/* MODULE 3: PRACTICAL PROJECTS PORTFOLIO */}
            <div className="verif-module-card full-width-card">
              <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="module-badge">Module 3 (10%)</div>
                  <h2>Practical Projects Portfolio</h2>
                </div>
                <button className="btn-primary" onClick={openAddProjectModal} style={{ fontSize: '13px', padding: '8px 16px' }}>
                  + Add New Project
                </button>
              </div>
              <p className="module-desc">
                Add your real-world software, data, or engineering projects. Project skills are <strong>restricted exclusively</strong> to verified resume skills and assessed skills to maintain verification integrity.
              </p>

              <div className="projects-grid-list">
                {userProjects.length > 0 ? (
                  userProjects.map((proj) => {
                    const skillsList = proj.skills || (proj.skills_used ? proj.skills_used.split(',').map(s => s.trim()) : [])
                    return (
                      <div key={proj.id} className="project-item-card">
                        <div className="project-card-header">
                          <div>
                            <h3 className="project-name">{proj.name}</h3>
                            <span className={`project-status-pill ${(proj.status || 'Completed').toLowerCase().replace(/\s+/g, '-')}`}>
                              {proj.status || 'Completed'}
                            </span>
                          </div>
                          <div className="project-actions">
                            <button className="proj-action-btn edit" onClick={() => openEditProjectModal(proj)} title="Edit Project">
                              ✎
                            </button>
                            <button className="proj-action-btn delete" onClick={() => handleDeleteProject(proj.id)} title="Delete Project">
                              🗑
                            </button>
                          </div>
                        </div>

                        <p className="project-desc">{proj.description}</p>

                        {proj.technologies_used && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                            <strong style={{ color: '#cbd5e1' }}>Technologies:</strong> {proj.technologies_used}
                          </div>
                        )}

                        {skillsList.length > 0 && (
                          <div className="project-skills-row">
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Verified Skills:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {skillsList.map((sk, sidx) => (
                                <span key={sidx} className="proj-skill-tag">✓ {sk}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="project-links-row">
                          {proj.github_link && (
                            <a href={proj.github_link} target="_blank" rel="noopener noreferrer" className="proj-link">
                              🔗 GitHub Repository
                            </a>
                          )}
                          {proj.demo_link && (
                            <a href={proj.demo_link} target="_blank" rel="noopener noreferrer" className="proj-link demo">
                              🌐 Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-projects-state">
                    <p>No projects added yet. Add a project to earn 10% career readiness score contribution (currently 0%).</p>
                    <button className="btn-primary" onClick={openAddProjectModal}>
                      + Add Your First Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ADD / EDIT PROJECT MODAL */}
          {showProjectModal && (
            <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
              <div className="project-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{projectForm.editingId ? 'Edit Project' : 'Add Verified Project'}</h2>
                  <button className="modal-close-btn" onClick={() => setShowProjectModal(false)}>✕</button>
                </div>

                <form onSubmit={handleSaveProject} className="project-modal-form">
                  <div className="form-group">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. E-Commerce Microservices Platform"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the problem solved, architecture, and features..."
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Technologies Used</label>
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, PostgreSQL, Docker, AWS"
                      value={projectForm.technologies_used}
                      onChange={(e) => setProjectForm({ ...projectForm, technologies_used: e.target.value })}
                    />
                  </div>

                  {/* RESTRICTED SKILLS USED SELECTOR */}
                  <div className="form-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Skills Used (Restricted to Verified Skills) *</span>
                      <span style={{ fontSize: '11px', color: '#818cf8' }}>From Resume & Assessments</span>
                    </label>

                    {availableProjectSkills.length > 0 ? (
                      <div className="skills-chip-cloud" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                        {availableProjectSkills.map((sk) => {
                          const isSelected = projectForm.skills_used.includes(sk)
                          return (
                            <button
                              key={sk}
                              type="button"
                              className={`skill-select-chip ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleToggleProjectSkill(sk)}
                            >
                              {isSelected ? `✓ ${sk}` : `+ ${sk}`}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#fbbf24', margin: '4px 0' }}>
                        ⚠️ Upload a resume or complete a skill assessment to verify technical skills for this project.
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Project Status</label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    >
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label>GitHub Repository URL</label>
                      <input
                        type="url"
                        placeholder="https://github.com/username/project"
                        value={projectForm.github_link}
                        onChange={(e) => setProjectForm({ ...projectForm, github_link: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Live Demo URL</label>
                      <input
                        type="url"
                        placeholder="https://project-demo.com"
                        value={projectForm.demo_link}
                        onChange={(e) => setProjectForm({ ...projectForm, demo_link: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowProjectModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={projectSaving}>
                      {projectSaving ? 'Saving Project...' : (projectForm.editingId ? 'Update Project' : 'Add Project')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW RESUME MODAL */}
          {viewResumeModal && (
            <div className="modal-overlay" onClick={() => setViewResumeModal(null)}>
              <div className="resume-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📄</span> {viewResumeModal.filename || 'Resume Document'}
                    </h2>
                    <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                      {(viewResumeModal.file_type || 'Document').toUpperCase()} • Score: {viewResumeModal.resume_score || 0}/100
                    </span>
                  </div>
                  <button className="modal-close-btn" onClick={() => setViewResumeModal(null)}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
                  <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                      Document Information
                    </h4>
                    <div className="resume-info-field">
                      <strong>Filename:</strong> <span>{viewResumeModal.filename || 'resume.pdf'}</span>
                    </div>
                    <div className="resume-info-field">
                      <strong>Format:</strong> <span>{(viewResumeModal.file_type || 'Unknown').toUpperCase()} Document</span>
                    </div>
                    <div className="resume-info-field">
                      <strong>Analysis Status:</strong> <span style={{ color: '#34d399', fontWeight: '600' }}>✓ {viewResumeModal.status || 'Verified'}</span>
                    </div>
                    <div className="resume-info-field">
                      <strong>Resume Score:</strong> <span style={{ color: (viewResumeModal.resume_score || 0) >= 70 ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>{viewResumeModal.resume_score || 0} / 100</span>
                    </div>
                    {viewResumeModal.extracted_data?.candidate_name && (
                      <div className="resume-info-field">
                        <strong>Candidate Name:</strong> <span>{viewResumeModal.extracted_data.candidate_name}</span>
                      </div>
                    )}
                    {viewResumeModal.extracted_data?.email && (
                      <div className="resume-info-field">
                        <strong>Email:</strong> <span>{viewResumeModal.extracted_data.email}</span>
                      </div>
                    )}
                    {viewResumeModal.extracted_data?.phone && (
                      <div className="resume-info-field">
                        <strong>Phone:</strong> <span>{viewResumeModal.extracted_data.phone}</span>
                      </div>
                    )}
                    {viewResumeModal.extracted_data?.education && (
                      <div className="resume-info-field">
                        <strong>Education:</strong> <span>{viewResumeModal.extracted_data.education}</span>
                      </div>
                    )}
                  </div>

                  {viewResumeModal.skills && viewResumeModal.skills.length > 0 && (
                    <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                        Extracted Skills ({viewResumeModal.skills.length})
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {viewResumeModal.skills.map((sk, idx) => (
                          <span key={idx} className="skill-mini-chip" style={{ fontSize: '12px', padding: '4px 10px' }}>
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewResumeModal.missing_sections && viewResumeModal.missing_sections.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <strong style={{ fontSize: '12px', color: '#f87171', display: 'block', marginBottom: '4px' }}>Missing Resume Sections:</strong>
                      <span style={{ fontSize: '13px', color: '#fca5a5' }}>
                        {Array.isArray(viewResumeModal.missing_sections) ? viewResumeModal.missing_sections.join(', ') : viewResumeModal.missing_sections}
                      </span>
                    </div>
                  )}

                  {viewResumeModal.extracted_data?.raw_text && (
                    <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                        Extracted Document Preview
                      </h4>
                      <pre style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', background: '#030712', padding: '10px', borderRadius: '6px' }}>
                        {viewResumeModal.extracted_data.raw_text.slice(0, 1500)}
                        {viewResumeModal.extracted_data.raw_text.length > 1500 ? '...' : ''}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {viewResumeModal.has_file !== false && (
                    <a
                      href={`${API_URL}/resume/${viewResumeModal.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '13px' }}
                    >
                      Open File in New Tab ↗
                    </a>
                  )}
                  <button type="button" className="btn-secondary" onClick={() => setViewResumeModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          PAGE: DYNAMIC QUIZ TAKER (LEGACY SINGLE SKILL)
      ===================================================== */}
      {page === 'assessment_quiz' && user && (
        <div className="app-container">
          {!quizResult ? (
            <div className="quiz-container">
              <div className="quiz-header">
                <div>
                  <span className="badge-tag">Skill Verification Assessment</span>
                  <h1>10-Question Skill Test: <span>{assessmentSkill}</span></h1>
                  <p>Answer all questions to verify your technical proficiency. (4 Easy, 4 Medium, 2 Hard)</p>
                </div>
                <div className="quiz-progress-badge">
                  {Object.keys(quizAnswers).length} / {quizQuestions.length} Answered
                </div>
              </div>

              <div className="questions-list">
                {quizQuestions.map((q, idx) => (
                  <div key={q.id || q.question_id || idx} className="question-card">
                    <div className="question-card-top">
                      <span className="question-num">Question {idx + 1} of {quizQuestions.length}</span>
                      <span className={`diff-badge diff-${(q.difficulty || 'medium').toLowerCase()}`}>
                        {q.difficulty || 'Medium'}
                      </span>
                    </div>
                    <h3 className="question-text">{q.question}</h3>

                    <div className="options-grid">
                      {(q.options || []).map((optText, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx)
                        const isSelected = quizAnswers[q.id || q.question_id || (idx + 1)] === optIdx
                        return (
                          <div
                            key={optIdx}
                            className={`option-box ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectAnswer(q.id || q.question_id || (idx + 1), optIdx)}
                          >
                            <span className="option-letter">{letter}</span>
                            <span className="option-text">{optText}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="quiz-footer-actions">
                <button className="btn-secondary" onClick={() => navigateTo('assessment')}>
                  Cancel & Exit
                </button>
                <button
                  className="btn-primary"
                  disabled={quizSubmitting}
                  onClick={handleSubmitAssessment}
                >
                  {quizSubmitting ? 'Evaluating Assessment...' : 'Submit Verification Test'}
                </button>
              </div>
            </div>
          ) : (
            /* ASSESSMENT RESULT CARD */
            <div className="assessment-result-card">
              <div className="result-header">
                <div>
                  <span className="badge-tag">Assessment Result</span>
                  <h1>Verification Summary for <span>{quizResult.skill}</span></h1>
                </div>
                <div className={`result-status-pill ${(quizResult.status || 'passed').toLowerCase()}`}>
                  {quizResult.status} ({quizResult.level})
                </div>
              </div>

              <div className="result-metrics-row">
                <div className="result-metric">
                  <span>Total Score</span>
                  <strong className="metric-highlight">{quizResult.score}%</strong>
                </div>
                <div className="result-metric">
                  <span>Correct Answers</span>
                  <strong>{quizResult.correct_answers} / {quizResult.total_questions}</strong>
                </div>
                <div className="result-metric">
                  <span>Skill Level</span>
                  <strong>{quizResult.level}</strong>
                </div>
              </div>

              {quizResult.performance_message && (
                <div className="result-feedback-box">
                  <strong>Assessment Evaluation:</strong>
                  <p>{quizResult.performance_message}</p>
                </div>
              )}

              <div className="result-actions">
                <button className="btn-primary" onClick={() => handleStartAssessment(assessmentSkill)}>
                  Retake Assessment
                </button>
                <button className="btn-secondary" onClick={() => navigateTo('skills')}>
                  View Skill Profile Matrix
                </button>
                <button className="btn-secondary" onClick={() => navigateTo('jobs')}>
                  View Matching Jobs
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          PAGE: SKILL ANALYSIS & MATRIX
      ===================================================== */}
      {page === 'skills' && user && (
        <div className="app-container">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span className="badge-tag">Competency Intelligence</span>
              <h1>Skill Profile Matrix & Gap Analysis</h1>
              <p>In-depth breakdown of your verified competencies across Resume, Assessments, Certificates, and Projects.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={targetRole}
                onChange={(e) => handleTargetRoleChange(e.target.value)}
                className="role-selector-input"
                style={{ width: '220px' }}
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={() => navigateTo('assessment')}>
                Take Assessment →
              </button>
            </div>
          </div>

          {/* 3-COLUMN SKILL GAP ANALYSIS */}
          <div className="section-title">
            <h2>Skill Gap Analysis for {targetRole}</h2>
            <p>Benchmarked against standard industry role requirements</p>
          </div>

          <div className="gap-analysis-grid">
            {/* STRONG SKILLS */}
            <div className="gap-card strong">
              <div className="gap-card-top">
                <span className="gap-icon">🟢</span>
                <h3>Strong Skills ({skillMatrixData?.gap_analysis?.strong_skills?.length ?? skillsProfile.filter(s => s.score >= 70).length})</h3>
              </div>
              <p className="gap-card-desc">Verified competencies with strong assessment and project evidence.</p>
              <div className="gap-skills-list">
                {(skillMatrixData?.gap_analysis?.strong_skills?.length > 0
                  ? skillMatrixData.gap_analysis.strong_skills
                  : skillsProfile.filter(s => s.score >= 70).map(s => s.skill)
                ).map((sk, idx) => (
                  <span key={idx} className="gap-skill-chip strong">✓ {sk}</span>
                ))}
                {(!skillMatrixData?.gap_analysis?.strong_skills || skillMatrixData.gap_analysis.strong_skills.length === 0) && skillsProfile.filter(s => s.score >= 70).length === 0 && (
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Score ≥ 70% in assessments to add strong skills.</span>
                )}
              </div>
            </div>

            {/* NEEDS IMPROVEMENT */}
            <div className="gap-card improve">
              <div className="gap-card-top">
                <span className="gap-icon">🟡</span>
                <h3>Needs Improvement ({skillMatrixData?.gap_analysis?.needs_improvement?.length ?? skillsProfile.filter(s => s.score < 70).length})</h3>
              </div>
              <p className="gap-card-desc">Skills identified in resume or initial tests that need higher mastery.</p>
              <div className="gap-skills-list">
                {(skillMatrixData?.gap_analysis?.needs_improvement?.length > 0
                  ? skillMatrixData.gap_analysis.needs_improvement
                  : skillsProfile.filter(s => s.score < 70).map(s => s.skill)
                ).map((sk, idx) => (
                  <span key={idx} className="gap-skill-chip improve">▲ {sk}</span>
                ))}
                {(!skillMatrixData?.gap_analysis?.needs_improvement || skillMatrixData.gap_analysis.needs_improvement.length === 0) && skillsProfile.filter(s => s.score < 70).length === 0 && (
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>No urgent improvements flagged.</span>
                )}
              </div>
            </div>

            {/* MISSING ROLE SKILLS */}
            <div className="gap-card missing">
              <div className="gap-card-top">
                <span className="gap-icon">🔴</span>
                <h3>Missing Role Skills ({skillMatrixData?.gap_analysis?.missing_skills?.length ?? 0})</h3>
              </div>
              <p className="gap-card-desc">Key requirements for {targetRole} not yet verified in your profile.</p>
              <div className="gap-skills-list">
                {(skillMatrixData?.gap_analysis?.missing_skills || []).map((sk, idx) => (
                  <span key={idx} className="gap-skill-chip missing">+ {sk}</span>
                ))}
                {(!skillMatrixData?.gap_analysis?.missing_skills || skillMatrixData.gap_analysis.missing_skills.length === 0) && (
                  <span style={{ fontSize: '13px', color: '#34d399' }}>All core role skills have baseline verification!</span>
                )}
              </div>
            </div>
          </div>

          {/* SKILL PROFILE MATRIX TABLE */}
          <div className="section-title" style={{ marginTop: '45px' }}>
            <h2>Skill Profile Matrix</h2>
            <p>Verification cross-reference across all 4 credential channels</p>
          </div>

          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Skill Name</th>
                  <th>In Resume</th>
                  <th>Assessment Score</th>
                  <th>Certificate</th>
                  <th>Project Evidence</th>
                  <th>Proficiency Level</th>
                </tr>
              </thead>
              <tbody>
                {(skillMatrixData?.matrix || (skillsProfile.length > 0 ? skillsProfile.map(s => ({
                  skill: s.skill,
                  in_resume: resumeData?.skills?.includes(s.skill) || false,
                  assessment_score: `${s.score}%`,
                  in_certificate: certificatesList.length > 0,
                  in_project: userProjects.some(p => (p.skills_used || '').includes(s.skill)),
                  level: s.level || 'Intermediate'
                })) : [
                  { skill: 'Python', in_resume: true, assessment_score: '85%', in_certificate: true, in_project: true, level: 'Advanced' },
                  { skill: 'React', in_resume: true, assessment_score: '80%', in_certificate: false, in_project: true, level: 'Proficient' },
                  { skill: 'SQL', in_resume: true, assessment_score: '75%', in_certificate: false, in_project: false, level: 'Intermediate' }
                ])).map((item, midx) => (
                  <tr key={midx}>
                    <td><strong>{item.skill}</strong></td>
                    <td>
                      <span className={`matrix-check ${item.in_resume ? 'yes' : 'no'}`}>
                        {item.in_resume ? '✓ Verified' : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#38bdf8' }}>
                        {item.assessment_score || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`matrix-check ${item.in_certificate ? 'yes' : 'no'}`}>
                        {item.in_certificate ? '✓ Verified' : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`matrix-check ${item.in_project ? 'yes' : 'no'}`}>
                        {item.in_project ? '✓ Portfolio' : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`table-status-badge ${(item.level || 'Intermediate').toLowerCase()}`}>
                        {item.level || 'Intermediate'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ASSESSMENT ATTEMPT HISTORY */}
          {assessmentHistory.length > 0 && (
            <div style={{ marginTop: '45px' }}>
              <div className="section-title">
                <h2>Assessment Logs ({assessmentHistory.length})</h2>
              </div>
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Skill / Role</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Level</th>
                      <th>Correct</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentHistory.map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.skill}</strong></td>
                        <td>{h.score}%</td>
                        <td>
                          <span className={`table-status-badge ${(h.status || '').toLowerCase()}`}>
                            {h.status}
                          </span>
                        </td>
                        <td>{h.level}</td>
                        <td>{h.correct_answers} / {h.total_questions}</td>
                        <td>{h.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          PAGE: JOBS & INTERNSHIPS (WITH WORK MODE & BOOKMARKS)
      ===================================================== */}
      {page === 'jobs' && user && (
        <div className="app-container">
          <div className="page-header">
            <div>
              <span className="badge-tag">Authentic Career Matching</span>
              <h1>Verified Jobs & Internships</h1>
              <p>Legitimate job opportunities with skill relevance matching, "Why this matches you" breakdowns, and direct links to original application portals.</p>
            </div>
          </div>

          {/* SEARCH & FILTERS ROW */}
          <div className="job-filters-bar">
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search by title, company, skills (e.g. React, Python)..."
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                className="job-search-input"
              />
            </div>

            {/* WORK MODE FILTER */}
            <div className="job-filter-select-group">
              <label>Work Mode:</label>
              <select
                value={jobWorkModeFilter}
                onChange={(e) => setJobWorkModeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            {/* EXPERIENCE FILTER */}
            <div className="job-filter-select-group">
              <label>Experience:</label>
              <select
                value={jobExpFilter}
                onChange={(e) => setJobExpFilter(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Levels</option>
                <option value="Entry Level">Entry Level</option>
                <option value="Mid-Senior">Mid-Senior Level</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {jobSearchQuery && (
              <button
                className="btn-secondary"
                onClick={() => setJobSearchQuery('')}
                style={{ padding: '10px 14px', fontSize: '13px' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* JOB FILTER TABS */}
          <div className="job-tabs-nav">
            <button
              className={`job-tab ${activeJobTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveJobTab('all')}
            >
              All Matches ({jobRecommendations?.total_jobs_found || 18})
            </button>
            <button
              className={`job-tab ${activeJobTab === 'recommended' ? 'active' : ''}`}
              onClick={() => setActiveJobTab('recommended')}
            >
              Recommended Jobs ({jobRecommendations?.categories?.recommended_jobs?.length || 0})
            </button>
            <button
              className={`job-tab ${activeJobTab === 'internships' ? 'active' : ''}`}
              onClick={() => setActiveJobTab('internships')}
            >
              Internships ({jobRecommendations?.categories?.internships?.length || 0})
            </button>
            <button
              className={`job-tab ${activeJobTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveJobTab('saved')}
            >
              ★ Saved Bookmarks ({jobRecommendations?.categories?.saved_jobs?.length || 0})
            </button>
          </div>

          {/* JOBS LIST GRID */}
          {filteredJobs.length === 0 ? (
            <div className="empty-state-box">
              <h3>No matching jobs found</h3>
              <p>Try adjusting your search query, changing filters, or taking a diagnostic assessment to expand your matches.</p>
              <button className="btn-primary" onClick={() => navigateTo('assessment')}>
                Take Assessment
              </button>
            </div>
          ) : (
            <div className="jobs-grid">
              {filteredJobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-card-header">
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="job-source-tag">{job.source}</span>
                        {job.work_mode && (
                          <span className={`work-mode-pill ${job.work_mode.toLowerCase()}`}>
                            {job.work_mode}
                          </span>
                        )}
                      </div>
                      <h3 className="job-title">{job.title}</h3>
                      <span className="job-company">{job.company} • {job.location}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div className="job-match-badge">
                        <span className="match-num">{job.match_score}%</span>
                        <span className="match-lbl">Match</span>
                      </div>
                      <button
                        className={`save-bookmark-btn ${job.is_saved ? 'saved' : ''}`}
                        onClick={() => handleToggleSaveJob(job)}
                        title={job.is_saved ? 'Remove from bookmarks' : 'Save job bookmark'}
                      >
                        {job.is_saved ? '★ Saved' : '☆ Save'}
                      </button>
                    </div>
                  </div>

                  <div className="job-meta-row">
                    <span>💼 {job.job_type}</span>
                    <span>📈 {job.experience_level}</span>
                    <span>💰 {job.salary}</span>
                  </div>

                  {/* WHY THIS MATCHES YOU CALLOUT BOX */}
                  <div className="why-matches-box">
                    <span className="why-matches-title">⚡ Why this matches you:</span>
                    <p className="why-matches-desc">
                      {job.match_reason || (job.matching_skills && job.matching_skills.length > 0
                        ? `Matches ${job.matching_skills.length} of your verified skills (${job.matching_skills.map(m => typeof m === 'string' ? m : m.skill).slice(0, 3).join(', ')}). Fits your ${job.experience_level || 'career'} level profile.`
                        : `Relevant ${job.work_mode || 'tech'} position aligned with your target career goals.`)}
                    </p>
                  </div>

                  <p className="job-desc">{job.description}</p>

                  {/* MATCHING SKILLS TAGS */}
                  <div className="job-skills-section">
                    <span className="skills-subhead">Required Skills:</span>
                    <div className="job-skills-list">
                      {(job.required_skills || []).map((sk, sidx) => {
                        const isMatched = (job.matching_skills || []).some(m => (typeof m === 'string' ? m : m.skill).toLowerCase() === sk.toLowerCase())
                        return (
                          <span
                            key={sidx}
                            className={`job-skill-pill ${isMatched ? 'matched' : 'unmatched'}`}
                          >
                            {isMatched ? `✓ ${sk}` : sk}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* DIRECT APPLY BUTTON */}
                  <div className="job-card-actions">
                    <button
                      className="btn-primary apply-real-btn"
                      onClick={() => handleApplyJob(job)}
                    >
                      Apply on {job.source} ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="footer-grid">
          <div>
            <div className="logo" style={{ marginBottom: '12px' }}>
              VERI<span>XA</span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, color: '#94a3b8' }}>
              The Dynamic Career Verification and Job Matching Platform. Built with multi-competency diagnostic assessments, structured document analysis, restricted practical project portfolios, and transparent 70/10/10/10 readiness scoring.
            </p>
          </div>

          <div>
            <h4>Career Verification Architecture</h4>
            <ul>
              <li>1. Diagnostic Assessment (70% weight)</li>
              <li>2. Resume Verification & Completeness (10%)</li>
              <li>3. Certificate Authenticity (10%)</li>
              <li>4. Practical Verified Projects (10%)</li>
              <li>5. Skill Matrix & Target Role Gap Analysis</li>
            </ul>
          </div>

          <div>
            <h4>Authentic Job Portals</h4>
            <ul>
              <li>LinkedIn Corporate Jobs</li>
              <li>Indeed Tech & Remote</li>
              <li>Internshala Graduate Roles</li>
              <li>Naukri Enterprise Listings</li>
              <li>Wellfound Startup Ecosystem</li>
            </ul>
          </div>

          <div>
            <h4>Readiness Standard</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.6', background: '#090d16', padding: '12px 16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <strong>70/10/10/10 Formula:</strong><br />
              (0.70 × Assessment) + (0.10 × Resume) + (0.10 × Certificates) + (0.10 × Projects)<br />
              <span style={{ color: '#38bdf8' }}>Practical projects require verified skills.</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 VERIXA Platform. All rights reserved. Zero fake jobs, zero ghost postings, 100% verified talent.
        </div>
      </footer>
    </div>
  )
}
