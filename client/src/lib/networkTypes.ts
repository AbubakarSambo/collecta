export type NetworkType = 'ESTATE' | 'CHAMA' | 'SUPPLIER' | 'DEBT' | 'GYM' | 'COMMUNITY' | 'SCHOOL' | 'CHURCH' | 'SPORTS' | 'COOPERATIVE'

export interface NetworkVocab {
  memberNoun: string
  memberNounPlural: string
  feeNoun: string
  feeNounPlural: string
}

export const NETWORK_VOCAB: Record<NetworkType, NetworkVocab> = {
  ESTATE: {
    memberNoun: 'resident',
    memberNounPlural: 'residents',
    feeNoun: 'service charge',
    feeNounPlural: 'service charges',
  },
  CHAMA: {
    memberNoun: 'member',
    memberNounPlural: 'members',
    feeNoun: 'contribution',
    feeNounPlural: 'contributions',
  },
  SUPPLIER: {
    memberNoun: 'client',
    memberNounPlural: 'clients',
    feeNoun: 'invoice',
    feeNounPlural: 'invoices',
  },
  DEBT: {
    memberNoun: 'borrower',
    memberNounPlural: 'borrowers',
    feeNoun: 'payment',
    feeNounPlural: 'payments',
  },
  GYM: {
    memberNoun: 'member',
    memberNounPlural: 'members',
    feeNoun: 'membership fee',
    feeNounPlural: 'membership fees',
  },
  COMMUNITY: {
    memberNoun: 'member',
    memberNounPlural: 'members',
    feeNoun: 'dues',
    feeNounPlural: 'dues',
  },
  SCHOOL: {
    memberNoun: 'student',
    memberNounPlural: 'students',
    feeNoun: 'levy',
    feeNounPlural: 'levies',
  },
  CHURCH: {
    memberNoun: 'member',
    memberNounPlural: 'members',
    feeNoun: 'offering',
    feeNounPlural: 'offerings',
  },
  SPORTS: {
    memberNoun: 'player',
    memberNounPlural: 'players',
    feeNoun: 'dues',
    feeNounPlural: 'dues',
  },
  COOPERATIVE: {
    memberNoun: 'member',
    memberNounPlural: 'members',
    feeNoun: 'contribution',
    feeNounPlural: 'contributions',
  },
}

export function getNetworkVocab(networkType?: string | null): NetworkVocab {
  return NETWORK_VOCAB[(networkType as NetworkType)] ?? NETWORK_VOCAB.ESTATE
}
