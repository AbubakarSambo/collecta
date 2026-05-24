import apiClient from './client'

export const chargesApi = {
  list: (networkId: string, params?: {
    page?: number
    limit?: number
    status?: string
    memberId?: string
    feeId?: string
  }) => apiClient.get(`/networks/${networkId}/charges`, { params }).then((r) => r.data),

  getSummary: (networkId: string) =>
    apiClient.get(`/networks/${networkId}/charges/summary`).then((r) => r.data),

  create: (networkId: string, data: {
    memberId: string
    feeId?: string
    amount: number
    dueDate: string
    description?: string
  }) => apiClient.post(`/networks/${networkId}/charges`, data).then((r) => r.data),

  waive: (networkId: string, id: string) =>
    apiClient.patch(`/networks/${networkId}/charges/${id}/waive`).then((r) => r.data),
}
