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
  role: string
  mentor_status: string
  referral_code: string | null
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
    referral_code?: string | null
  }): Promise<TokenResponse> {
    return apiRequest('POST', '/api/auth/register', data)
  },

  async login(data: { email: string; password: string }): Promise<TokenResponse> {
    return apiRequest('POST', '/api/auth/login', data)
  },

  async getMe(): Promise<UserInfo> {
    return apiRequest('GET', '/api/auth/me')
  },

  async updateProfile(data: { name?: string; icf_level?: string }): Promise<UserInfo> {
    return apiRequest('PATCH', '/api/auth/me', data)
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

export interface JobAcceptedResponse {
  job_id: string
}

export interface JobStatusResponse {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  session_id: string | null
  error_message: string | null
}

export const analyze = {
  async submitAnalysis(file: File, sessionType: 'initial' | 'follow_up' = 'initial'): Promise<JobAcceptedResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_type', sessionType)
    return apiRequest('POST', '/api/analyze', formData, true)
  },

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return apiRequest('GET', `/api/analyze/status/${jobId}`)
  },
}

// ---- Feedback ----

export interface CouponInfo {
  id: string
  code: string
  discount_amount: number
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface FeedbackSubmitResponse {
  success: boolean
  coupon: CouponInfo | null
}

export const feedback = {
  async submit(
    sessionId: string,
    data: { satisfaction: number; accuracy: number; comment: string },
  ): Promise<FeedbackSubmitResponse> {
    return apiRequest('POST', `/api/feedback/${sessionId}`, data)
  },
}

// ---- Coupons ----

export const coupons = {
  async list(): Promise<CouponInfo[]> {
    return apiRequest('GET', '/api/coupons')
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

// ---- Notices ----

export interface Notice {
  id: string
  title: string
  body: string
  published_at: string | null
  is_published: boolean
  created_at: string
}

export const notices = {
  async getLatest(): Promise<Notice | null> {
    return apiRequest('GET', '/api/notices/latest')
  },

  async get(id: string): Promise<Notice> {
    return apiRequest('GET', `/api/notices/${id}`)
  },

  async markAsRead(id: string): Promise<{ success: boolean }> {
    return apiRequest('POST', `/api/notices/${id}/read`)
  },
}

// ---- Payments ----

export const payments = {
  async createCheckout(pack: '1' | '3' | '10', couponCode?: string): Promise<{ url: string }> {
    return apiRequest('POST', '/api/payments/checkout', { pack, coupon_code: couponCode || null })
  },
}

// ---- Mentors ----

export interface MentorInfo {
  id: string
  user_id: string
  display_name: string
  credential: string
  coaching_years: number
  bio: string
  photo_url: string | null
  specialties: string[]
  client_type: string
  style_note: string | null
  contact_url: string
  sns_url: string | null
  is_active: boolean
  view_count: number
  click_count: number
  created_at: string
  updated_at: string
}

export interface AdminMentorInfo {
  id: string
  user_id: string
  user_name: string
  user_email: string
  display_name: string
  credential: string
  coaching_years: number
  bio: string
  photo_url: string | null
  specialties: string[]
  client_type: string
  contact_url: string
  is_active: boolean
  mentor_status: string
  created_at: string
}

export interface MentorApplyData {
  display_name: string
  credential: string
  coaching_years: number
  bio: string
  photo_url?: string | null
  specialties: string[]
  client_type: string
  style_note?: string | null
  contact_url: string
  sns_url?: string | null
}

export const mentors = {
  async apply(data: MentorApplyData): Promise<{ success: boolean }> {
    return apiRequest('POST', '/api/mentors/apply', data)
  },

  async list(credential?: string, specialty?: string): Promise<MentorInfo[]> {
    const params = new URLSearchParams()
    if (credential) params.set('credential', credential)
    if (specialty) params.set('specialty', specialty)
    const qs = params.toString()
    return apiRequest('GET', `/api/mentors${qs ? `?${qs}` : ''}`)
  },

  async get(id: string): Promise<MentorInfo> {
    return apiRequest('GET', id === 'me' ? '/api/mentors/me' : `/api/mentors/${id}`)
  },

  async updateProfile(data: Partial<MentorApplyData>): Promise<MentorInfo> {
    return apiRequest('PATCH', '/api/mentors/profile', data)
  },

  async trackView(): Promise<{ success: boolean }> {
    return apiRequest('POST', '/api/mentors/track/view')
  },

  async trackClick(mentorId: string): Promise<{ success: boolean }> {
    return apiRequest('POST', `/api/mentors/${mentorId}/track/click`)
  },

  async recommend(competencies: string[]): Promise<MentorInfo[]> {
    return apiRequest('GET', `/api/mentors/recommend?competencies=${competencies.join(',')}`)
  },

  async uploadPhoto(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest('POST', '/api/mentors/upload-photo', formData, true)
  },
}

export const adminMentors = {
  async list(): Promise<AdminMentorInfo[]> {
    return apiRequest('GET', '/api/admin/mentors')
  },

  async approve(userId: string): Promise<{ success: boolean }> {
    return apiRequest('PATCH', `/api/admin/mentors/${userId}/approve`)
  },

  async reject(userId: string): Promise<{ success: boolean }> {
    return apiRequest('PATCH', `/api/admin/mentors/${userId}/reject`)
  },

  async toggleActive(userId: string): Promise<{ success: boolean }> {
    return apiRequest('PATCH', `/api/admin/mentors/${userId}/toggle-active`)
  },
}

export const adminNotices = {
  async list(): Promise<Notice[]> {
    return apiRequest('GET', '/api/admin/notices')
  },

  async create(data: { title: string; body: string; published_at: string | null; is_published: boolean }): Promise<Notice> {
    return apiRequest('POST', '/api/admin/notices', data)
  },

  async update(id: string, data: Partial<{ title: string; body: string; published_at: string | null; is_published: boolean }>): Promise<Notice> {
    return apiRequest('PUT', `/api/admin/notices/${id}`, data)
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return apiRequest('DELETE', `/api/admin/notices/${id}`)
  },
}
