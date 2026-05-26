export type NetworkType = 'ESTATE' | 'CHAMA' | 'SUPPLIER' | 'DEBT'

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
}

export function getNetworkVocab(networkType?: string | null): NetworkVocab {
  return NETWORK_VOCAB[(networkType as NetworkType)] ?? NETWORK_VOCAB.ESTATE
}
