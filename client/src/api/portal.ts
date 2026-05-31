import apiClient from './client'

export const portalApi = {
  getNetwork: (slug: string) =>
    apiClient.get(`/portal/${slug}`).then((r) => r.data),

  getMemberProfile: (slug: string, memberId: string) =>
    apiClient.get(`/portal/${slug}/member/${memberId}/profile`).then((r) => r.data),

  getBenchmark: (slug: string, memberId: string) =>
    apiClient.get(`/portal/${slug}/member/${memberId}/benchmark`).then((r) => r.data),

  getCharge: (slug: string, chargeId: string) =>
    apiClient.get(`/portal/${slug}/charge/${chargeId}`).then((r) => r.data),

  initiatePayment: (slug: string, chargeId: string, amount?: number, paymentMethod?: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money') =>
    apiClient.post(`/portal/${slug}/pay/${chargeId}`, {
      ...(amount ? { amount } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    }).then((r) => r.data),

  getMemberByInvite: (slug: string, token: string) =>
    apiClient.get(`/portal/${slug}/join/${token}`).then((r) => r.data),

  getMemberByEmail: (slug: string, email: string) =>
    apiClient.get(`/portal/${slug}/member-by-email?email=${encodeURIComponent(email)}`).then((r) => r.data),

  payOpenFee: (
    slug: string,
    feeId: string,
    payer: { firstName: string; lastName: string; email: string; amount?: number },
  ) =>
    apiClient.post(`/portal/${slug}/open-fee/${feeId}/pay`, payer).then((r) => r.data),

  getPaymentHistoryByEmail: (slug: string, email: string) =>
    apiClient
      .get(`/portal/${slug}/payment-history?email=${encodeURIComponent(email)}`)
      .then((r) => r.data),

  smsOptOut: (slug: string, memberId: string) =>
    apiClient.post(`/portal/${slug}/member/${memberId}/sms-opt-out`).then((r) => r.data),
}
