const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ---- Token management ----

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function removeToken(): void {
  localStorage.removeItem('token')
}

// ---- Base request ----

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm?: boolean,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let fetchBody: BodyInit | undefined
  if (body && isForm) {
    fetchBody = body as FormData
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: fetchBody,
    })
  } catch {
    throw new Error('サーバーに接続できませんでした。時間をおいて再度お試しください。')
  }

  if (res.status === 401) {
    removeToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      errorDetail = errJson.detail || errorDetail
    } catch {
      // ignore
    }
    throw new Error(errorDetail)
  }

  return res.json() as Promise<T>
}

// ---- Auth ----

export interface UserInfo {
  id: string
  name: string
  email: string
  icf_level: string
  credits: number
  is_admin: boolean
  created_at: string
  analysis_count: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export const auth = {
  async register(data: {
    name: string
    email: string
    password: string
    icf_level: string
  }): Promise<TokenResponse> {
    return apiRequest('POST', '/api/auth/register', data)
  },

  async login(data: { email: string; password: string }): Promise<TokenResponse> {
    return apiRequest('POST', '/api/auth/login', data)
  },

  async getMe(): Promise<UserInfo> {
    return apiRequest('GET', '/api/auth/me')
  },
}

// ---- Sessions ----

export interface SessionSummary {
  id: string
  duration_seconds: number
  coach_ratio: number
  avg_score: number
  scores: {
    competencies: Array<{ id: number; name: string; score: number }>
    overall_summary?: string
    qualification_comment?: string
    strengths_improvements?: {
      strengths: string[]
      improvements: string[]
      overall_comment: string
    }
  } | null
  created_at: string
}

export const sessions = {
  async list(): Promise<SessionSummary[]> {
    return apiRequest('GET', '/api/sessions')
  },

  async get(id: string): Promise<SessionSummary> {
    return apiRequest('GET', `/api/sessions/${id}`)
  },

  getPdfUrl(id: string): string {
    return `${API_URL}/api/sessions/${id}/pdf`
  },
}

// ---- Analyze ----

export interface AnalyzeResponse {
  session_id: string
  avg_score: number
}

export const analyze = {
  async submitAnalysis(file: File, sessionType: 'initial' | 'follow_up' = 'initial'): Promise<AnalyzeResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_type', sessionType)
    return apiRequest('POST', '/api/analyze', formData, true)
  },
}

// ---- Feedback ----

export const feedback = {
  async submit(
    sessionId: string,
    data: { satisfaction: number; accuracy: number; comment: string },
  ): Promise<{ success: boolean }> {
    return apiRequest('POST', `/api/feedback/${sessionId}`, data)
  },

  async confirmShare(
    sessionId: string,
    postUrl: string,
  ): Promise<{ success: boolean }> {
    return apiRequest('POST', `/api/sessions/${sessionId}/share`, { post_url: postUrl })
  },
}

// ---- Admin ----

export interface AdminFeedback {
  id: string
  session_id: string
  user_name: string
  user_email: string
  satisfaction: number
  accuracy: number
  comment: string | null
  created_at: string
}

export interface AdminTrendDataPoint {
  date: string
  analysis_count: number
  avg_score: number | null
  avg_satisfaction: number | null
  avg_accuracy: number | null
}

export const admin = {
  async listUsers(): Promise<UserInfo[]> {
    return apiRequest('GET', '/api/admin/users')
  },

  async updateCredits(userId: string, amount: number): Promise<{ user_id: string; new_credits: number }> {
    return apiRequest('PATCH', `/api/admin/users/${userId}/credits`, { amount })
  },

  async toggleAdmin(userId: string): Promise<{ user_id: string; is_admin: boolean }> {
    return apiRequest('PATCH', `/api/admin/users/${userId}/toggle-admin`)
  },

  async listFeedbacks(): Promise<AdminFeedback[]> {
    return apiRequest('GET', '/api/admin/feedbacks')
  },

  async listTrends(): Promise<AdminTrendDataPoint[]> {
    return apiRequest('GET', '/api/admin/trends')
  },
}

// ---- Credits ----

export interface CreditRecord {
  id: string
  amount: number
  reason: string
  created_at: string
}

export const credits = {
  async getHistory(): Promise<CreditRecord[]> {
    return apiRequest('GET', '/api/credits')
  },
}
