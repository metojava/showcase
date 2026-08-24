const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let unauthorizedHandler = () => {}
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn
}

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('nw_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running on port 8000?')
  }

  if (res.status === 401 && token) unauthorizedHandler?.()

  let payload = null
  try {
    payload = res.status === 204 ? null : await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    const detail = payload?.detail ?? payload?.message ?? res.statusText
    const message =
      typeof detail === 'string' ? detail : detail?.message || 'Request failed'
    throw new ApiError(res.status, message, detail?.errors)
  }
  return payload
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  del: (p) => request(p, { method: 'DELETE' }),
}
