import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false
let failedQueue = []   // requests waiting for new token

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // If 401 and we haven't already retried this request
    if (err.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      // No refresh token — force logout
      if (!refreshToken) {
        _forceLogout()
        return Promise.reject(err)
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(e => Promise.reject(e))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post('/api/auth/refresh', null, {
          params: { refresh_token: refreshToken },
        })

        const { access_token, refresh_token: newRefresh } = res.data

        // Persist new tokens
        localStorage.setItem('token', access_token)
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh)

        // Update default header
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

        processQueue(null, access_token)
        isRefreshing = false

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)

      } catch (refreshErr) {
        processQueue(refreshErr, null)
        isRefreshing = false
        _forceLogout()
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(err)
  }
)

function _forceLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   (refreshToken) => api.post('/auth/logout', null, { params: { refresh_token: refreshToken } }),
  refresh:  (refreshToken) => api.post('/auth/refresh', null, { params: { refresh_token: refreshToken } }),
  me:       () => api.get('/auth/me'),
  changePassword: (old_password, new_password) =>
    api.post('/auth/change-password', null, { params: { old_password, new_password } }),
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileAPI = {
  createSeeker:  (data) => api.post('/profile/seeker', data),
  getSeekerMe:   ()     => api.get('/profile/seeker/me'),
  updateSeeker:  (data) => api.patch('/profile/seeker', data),
  uploadResume: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/profile/seeker/upload-resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadAvatar: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/profile/seeker/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  createEmployer:  (data) => api.post('/profile/employer', data),
  getEmployerMe:   ()     => api.get('/profile/employer/me'),
  updateEmployer:  (data) => api.patch('/profile/employer', data),
  uploadLogo: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/profile/employer/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list:    (params) => api.get('/jobs', { params }),
  get:     (id)     => api.get(`/jobs/${id}`),
  create:  (data)   => api.post('/jobs', data),
  update:  (id, data) => api.patch(`/jobs/${id}`, data),
  delete:  (id)     => api.delete(`/jobs/${id}`),
  myJobs:  ()       => api.get('/jobs/employer/my-jobs'),
  save:    (id)     => api.post(`/jobs/${id}/save`),
  unsave:  (id)     => api.delete(`/jobs/${id}/save`),
  saved:   ()       => api.get('/jobs/seeker/saved'),
}

// ── Applications ──────────────────────────────────────────────────────────────
export const applicationsAPI = {
  apply:          (data)       => api.post('/applications', data),
  myApplications: (params)     => api.get('/applications/my-applications', { params }),
  withdraw:       (id)         => api.delete(`/applications/${id}`),
  forJob:         (jobId)      => api.get(`/applications/job/${jobId}`),
  updateStatus:   (id, data)   => api.patch(`/applications/${id}/status`, data),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  createSession: (data) => api.post('/chat/sessions', data),
  listSessions:  ()     => api.get('/chat/sessions'),
  getMessages:   (id)   => api.get(`/chat/sessions/${id}/messages`),
  deleteSession: (id)   => api.delete(`/chat/sessions/${id}`),
  renameSession: (id, title) => api.patch(`/chat/sessions/${id}/title`, null, { params: { title } }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:       ()         => api.get('/admin/stats'),
  users:       (params)   => api.get('/admin/users', { params }),
  updateUser:  (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser:  (id)       => api.delete(`/admin/users/${id}`),
  skills:      ()         => api.get('/admin/skills'),
  createSkill: (name)     => api.post('/admin/skills', null, { params: { name } }),
  deleteSkill: (id)       => api.delete(`/admin/skills/${id}`),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list:    (params) => api.get('/notifications', { params }),
  markRead:(id)     => api.patch(`/notifications/${id}/read`),
  markAllRead: ()   => api.patch('/notifications/read-all'),
  unreadCount: ()   => api.get('/notifications/unread-count'),
}