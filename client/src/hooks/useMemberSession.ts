export interface MemberSession {
  id: string
  firstName: string
  lastName: string
  email: string | null
  unit: string | null
  memberCode: string | null
  networkSlug: string
  networkName: string
}

const key = (slug: string) => `collecta_member_${slug}`

export function getMemberSession(slug: string): MemberSession | null {
  try {
    const raw = localStorage.getItem(key(slug))
    return raw ? (JSON.parse(raw) as MemberSession) : null
  } catch {
    return null
  }
}

export function saveMemberSession(session: MemberSession): void {
  localStorage.setItem(key(session.networkSlug), JSON.stringify(session))
}

export function clearMemberSession(slug: string): void {
  localStorage.removeItem(key(slug))
}
