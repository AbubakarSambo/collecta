import apiClient from './client'

export const remindersApi = {
  // Rules
  getRules: (networkId: string) =>
    apiClient
      .get(`/networks/${networkId}/reminders/rules`)
      .then((r) => r.data?.data ?? r.data),

  createRule: (networkId: string, data: { daysOffset: number; channels: string[] }) =>
    apiClient
      .post(`/networks/${networkId}/reminders/rules`, data)
      .then((r) => r.data?.data ?? r.data),

  deleteRule: (networkId: string, ruleId: string) =>
    apiClient
      .delete(`/networks/${networkId}/reminders/rules/${ruleId}`)
      .then((r) => r.data),

  // History & blast
  getHistory: (networkId: string) =>
    apiClient
      .get(`/networks/${networkId}/reminders/history`)
      .then((r) => r.data?.data ?? r.data),

  blastEstimate: (networkId: string, channels: string[]) =>
    apiClient
      .get(`/networks/${networkId}/reminders/blast-estimate`, {
        params: { channels: channels.join(',') },
      })
      .then((r) => r.data?.data ?? r.data),

  blast: (networkId: string, data: { channels: string[]; message?: string }) =>
    apiClient
      .post(`/networks/${networkId}/reminders/blast`, data)
      .then((r) => r.data?.data ?? r.data),

  sendToMember: (networkId: string, memberId: string, data: { channels: string[]; message?: string }) =>
    apiClient
      .post(`/networks/${networkId}/reminders/member/${memberId}`, data)
      .then((r) => r.data?.data ?? r.data),
}
