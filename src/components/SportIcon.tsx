import { CircleDot, Dribbble, Gamepad2, Goal, Swords, Trophy, Volleyball } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SportKey } from '../lib/types'
import { cn } from '../lib/cn'

export const SPORT_LABEL: Record<SportKey, string> = {
  football: 'Bóng đá',
  basketball: 'Bóng rổ',
  tennis: 'Tennis',
  volleyball: 'Bóng chuyền',
  esports: 'Esport',
  combat: 'Võ thuật',
  other: 'Khác',
  unknown: 'Khác',
}

export const SPORT_ORDER: SportKey[] = [
  'football',
  'basketball',
  'tennis',
  'volleyball',
  'esports',
  'combat',
  'other',
]

const ICONS: Record<SportKey, LucideIcon> = {
  football: Goal,
  basketball: CircleDot,
  tennis: Dribbble,
  volleyball: Volleyball,
  esports: Gamepad2,
  combat: Swords,
  other: Trophy,
  unknown: Trophy,
}

export function SportIcon({
  sport,
  className,
}: {
  sport: SportKey
  className?: string
}) {
  const Icon = ICONS[sport] ?? Trophy
  return <Icon aria-hidden className={cn('h-3.5 w-3.5 shrink-0 text-muted', className)} strokeWidth={1.75} />
}