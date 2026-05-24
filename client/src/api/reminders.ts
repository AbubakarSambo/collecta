import apiClient from './client'

export const remindersApi = {
  getHistory: (networkId: string) =>
    apiClient.get(`/networks/${networkId}/reminders/history`).then((r) => r.data),

  blast: (networkId: string, data: { channels: string[]; message?: string }) =>
    apiClient.post(`/networks/${networkId}/reminders/blast`, data).then((r) => r.data),

  sendToMember: (networkId: string, memberId: string, data: { channels: string[]; message?: string }) =>
    apiClient.post(`/networks/${networkId}/reminders/member/${memberId}`, data).then((r) => r.data),
}
