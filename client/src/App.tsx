import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout'
import { PortalLayout } from '@/components/layout'
import { ProtectedRoute, GuestRoute } from '@/components/shared'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

// App pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MembersPage } from '@/pages/members/MembersPage'
import { MemberDetailPage } from '@/pages/members/MemberDetailPage'
import { FeesPage } from '@/pages/fees/FeesPage'
import { FeeDetailPage } from '@/pages/fees/FeeDetailPage'
import { ChargesPage } from '@/pages/charges/ChargesPage'
import { PaymentsPage } from '@/pages/payments/PaymentsPage'
import { RemindersPage } from '@/pages/reminders/RemindersPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

// Portal pages (public)
import { MemberPortalPage } from '@/pages/portal/MemberPortalPage'
import { MemberProfilePage } from '@/pages/portal/MemberProfilePage'
import { MemberLoginPage } from '@/pages/portal/MemberLoginPage'
import { PaymentPage } from '@/pages/portal/PaymentPage'
import { PaymentCallbackPage } from '@/pages/portal/PaymentCallbackPage'
import { PaymentHistoryPage } from '@/pages/portal/PaymentHistoryPage'
import { VerificationInfoPage } from '@/pages/portal/VerificationInfoPage'

// Legal pages (public)
import { TermsPage } from '@/pages/legal/TermsPage'
import { PrivacyPage } from '@/pages/legal/PrivacyPage'
import { DpaPage } from '@/pages/legal/DpaPage'
import { AcceptableUsePage } from '@/pages/legal/AcceptableUsePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest-only routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Public auth routes */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Paystack callback (public) */}
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />

        {/* Member portal (public) */}
        <Route path="/n/:slug" element={<PortalLayout />}>
          <Route index element={<MemberPortalPage />} />
          <Route path="login" element={<MemberLoginPage />} />
          <Route path="profile/:memberId" element={<MemberProfilePage />} />
          <Route path="pay/:chargeId" element={<PaymentPage />} />
          <Route path="history" element={<PaymentHistoryPage />} />
        </Route>

        {/* Public info pages */}
        <Route path="/about/verification" element={<VerificationInfoPage />} />

        {/* Legal pages */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dpa" element={<DpaPage />} />
        <Route path="/acceptable-use" element={<AcceptableUsePage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/:id" element={<MemberDetailPage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/fees/:id" element={<FeeDetailPage />} />
            <Route path="/charges" element={<ChargesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}

export default App
