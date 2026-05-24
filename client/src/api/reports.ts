import apiClient from './client'

export const reportsApi = {
  collection: (networkId: string, months = 6) =>
    apiClient.get(`/networks/${networkId}/reports/collection`, { params: { months } }).then((r) => r.data),

  memberCompliance: (networkId: string) =>
    apiClient.get(`/networks/${networkId}/reports/members`).then((r) => r.data),

  exportExcel: (networkId: string) =>
    apiClient.get(`/networks/${networkId}/reports/export/excel`, { responseType: 'blob' }).then((r) => r.data),

  exportPdf: (networkId: string) =>
    apiClient.get(`/networks/${networkId}/reports/export/pdf`, { responseType: 'blob' }).then((r) => r.data),
}
