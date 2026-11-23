export type StatusFilter = 'all' | 'live' | 'upcoming' | 'ended'
export type DateFilter = 'all' | 'today' | 'tomorrow'

export interface GroupCount {
  name: string
  usable: number
  total: number
}

export interface CommentatorCount {
  key: string
  display: string
  count: number
  matchCount: number
}
