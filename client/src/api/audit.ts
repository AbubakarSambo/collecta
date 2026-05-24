import apiClient from './client'

export const auditApi = {
  list: (networkId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/networks/${networkId}/audit-logs`, { params }).then((r) => r.data),
}
