import apiClient from './client'

export const memberAuthApi = {
  requestOtp: (slug: string, email: string) =>
    apiClient.post('/member-auth/request-otp', { slug, email }).then((r) => r.data),

  verifyOtp: (slug: string, email: string, otp: string) =>
    apiClient.post('/member-auth/verify-otp', { slug, email, otp }).then((r) => r.data),
}
