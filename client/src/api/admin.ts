import apiClient from './client'

export const adminApi = {
  getStats: () => apiClient.get('/networks/admin/stats'),

  getAllNetworks: (params: { page?: number; search?: string } = {}) =>
    apiClient.get('/networks/admin/all', { params }),

  getPendingVerifications: () => apiClient.get('/networks/admin/verifications'),

  getMonitoringSignals: () => apiClient.get('/networks/admin/monitoring'),

  approveVerification: (networkId: string) =>
    apiClient.post(`/networks/verification/approve/${networkId}`),

  rejectVerification: (networkId: string, reason: string) =>
    apiClient.post(`/networks/verification/reject/${networkId}`, { reason }),
}
