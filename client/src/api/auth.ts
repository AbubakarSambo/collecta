import apiClient from './client'

export const authApi = {
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    networkName: string
    networkSlug: string
    networkDescription?: string
  }) => apiClient.post('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient.post(`/auth/verify-email?token=${token}`).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post('/auth/reset-password', data).then((r) => r.data),
}
