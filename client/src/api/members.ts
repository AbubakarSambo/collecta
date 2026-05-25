import apiClient from './client'

export const membersApi = {
  list: (networkId: string, params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get(`/networks/${networkId}/members`, { params }).then((r) => r.data),

  getById: (networkId: string, id: string) =>
    apiClient.get(`/networks/${networkId}/members/${id}`).then((r) => r.data),

  create: (networkId: string, data: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    unit?: string
    memberCode?: string
  }) => apiClient.post(`/networks/${networkId}/members`, data).then((r) => r.data),

  update: (networkId: string, id: string, data: object) =>
    apiClient.patch(`/networks/${networkId}/members/${id}`, data).then((r) => r.data),

  remove: (networkId: string, id: string) =>
    apiClient.delete(`/networks/${networkId}/members/${id}`).then((r) => r.data),

  importCsv: (networkId: string, csvData: string) =>
    apiClient.post(`/networks/${networkId}/members/import`, { csvData }).then((r) => r.data),

  getImportJobStatus: (networkId: string, jobId: string) =>
    apiClient.get(`/networks/${networkId}/members/import/${jobId}`).then((r) => r.data),

  getInviteLink: (networkId: string, id: string) =>
    apiClient.post(`/networks/${networkId}/members/${id}/invite-link`).then((r) => r.data),
}
