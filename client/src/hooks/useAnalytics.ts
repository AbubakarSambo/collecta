import { usePostHog } from 'posthog-js/react'

export function useAnalytics() {
  const posthog = usePostHog()

  function track(event: string, properties?: Record<string, unknown>) {
    posthog?.capture(event, properties)
  }

  function identify(userId: string, properties?: Record<string, unknown>) {
    posthog?.identify(userId, properties)
  }

  function reset() {
    posthog?.reset()
  }

  return { track, identify, reset }
}
