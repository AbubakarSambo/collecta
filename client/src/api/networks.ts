import apiClient from './client'

export const networksApi = {
  getMyNetwork: () => apiClient.get('/networks/me').then((r) => r.data),

  updateNetwork: (data: {
    name?: string
    description?: string
    logoUrl?: string
    timezone?: string
  }) => apiClient.patch('/networks/me', data).then((r) => r.data),

  getPaystackStatus: () => apiClient.get('/networks/me/paystack-status').then((r) => r.data),

  setupPaystack: (data: { bankCode: string; accountNumber: string }) =>
    apiClient.post('/networks/me/setup-paystack', data).then((r) => r.data),

  getBySlug: (slug: string) => apiClient.get(`/networks/${slug}`).then((r) => r.data),
}

export const paystackApi = {
  getBanks: (): Promise<Array<{ name: string; code: string }>> =>
    apiClient.get('/paystack/banks').then((r) => r.data.data ?? r.data),

  verifyAccount: (data: {
    accountNumber: string
    bankCode: string
  }): Promise<{ account_name: string }> =>
    apiClient.post('/paystack/verify-account', data).then((r) => r.data.data ?? r.data),
}
