import apiClient from './client'

export const paymentsApi = {
  list: (networkId: string, params?: {
    page?: number
    limit?: number
    memberId?: string
    startDate?: string
    endDate?: string
  }) => apiClient.get(`/networks/${networkId}/payments`, { params }).then((r) => r.data),

  create: (networkId: string, data: {
    chargeId: string
    memberId: string
    amount: number
    method?: string
    note?: string
  }) => apiClient.post(`/networks/${networkId}/payments`, data).then((r) => r.data),
}
