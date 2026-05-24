import apiClient from './client'

export const feesApi = {
  list: (networkId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/networks/${networkId}/fees`, { params }).then((r) => r.data),

  getById: (networkId: string, id: string) =>
    apiClient.get(`/networks/${networkId}/fees/${id}`).then((r) => r.data),

  create: (networkId: string, data: object) =>
    apiClient.post(`/networks/${networkId}/fees`, data).then((r) => r.data),

  update: (networkId: string, id: string, data: object) =>
    apiClient.patch(`/networks/${networkId}/fees/${id}`, data).then((r) => r.data),

  remove: (networkId: string, id: string) =>
    apiClient.delete(`/networks/${networkId}/fees/${id}`).then((r) => r.data),

  assignToMembers: (networkId: string, feeId: string, data: { memberIds: string[]; amount?: number }) =>
    apiClient.post(`/networks/${networkId}/fees/${feeId}/assign`, data).then((r) => r.data),

  removeAssignment: (networkId: string, feeId: string, memberId: string) =>
    apiClient.delete(`/networks/${networkId}/fees/${feeId}/assign/${memberId}`).then((r) => r.data),
}
