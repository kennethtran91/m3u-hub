import { describe, expect, it } from 'vitest'
import { snapshot } from './snapshot'
import { parsePlaylist, parseTitle, parseUpdatedMarker } from '../playlist'
import {
  calendarDayDiff,
  dateWithYearRollback,
  dayLabel,
  fmtDate,
  fmtDateTime,
  fmtTime,
  matchStatusAt,
} from '../time'

/**
 * Kickoff times in the playlist are Vietnam wall-clock times (UTC+7, no DST).
 * Every assertion here is expressed in absolute instants (Date.UTC) or in the
 * Vietnam display zone, so the suite is meaningful under ANY machine timezone
 * — including the default America/Chicago run and a forced `TZ=America/Chicago`.
 */
const NOW = new Date(Date.UTC(2026, 10, 21, 13, 5)) // 20:05 VN, 07:05 CST
const vn = (day: number, hour: number, minute: number, month = 11) =>
  new Date(Date.UTC(2026, month - 1, day, hour - 7, minute))

const parsed = parsePlaylist(snapshot(), NOW)

describe('Vietnam-time parsing', () => {
  it('reads the fixture kickoff 19:30 21/11 as 12:30 UTC', () => {
    const source = parsed.sources.find(
      (candidate) =>
        candidate.title.includes('Manchester City vs Fulham') &&
        candidate.title.includes('19:30 21/11'),
    )
    expect(source).toBeDefined()
    expect(source?.kickoff?.getTime()).toBe(Date.UTC(2026, 10, 21, 12, 30))
    // 19:30 VN is 12:30Z, i.e. 06:30 on a CST machine — the old code produced
    // 01:30Z the next day, 13 hours off.
    expect(source?.kickoff?.toISOString()).toBe('2026-11-21T12:30:00.000Z')
  })

  it('reads the "Updated 21/11 20:23" marker as 13:23 UTC', () => {
    expect(parsed.playlistUpdatedAt?.getTime()).toBe(Date.UTC(2026, 10, 21, 13, 23))
    expect(parseUpdatedMarker('Updated 21/11 20:23', NOW)?.date.toISOString()).toBe(
      '2026-11-21T13:23:00.000Z',
    )
  })

  it('keeps an early-morning kickoff that crosses a month boundary correct', () => {
    const kickoff = parseTitle('02:30 01/12 ⚽ A vs B', NOW)?.kickoff
    // 02:30 VN on 1/12 is 19:30Z on 30/11.
    expect(kickoff?.getTime()).toBe(Date.UTC(2026, 10, 30, 19, 30))
  })

  it('rejects impossible calendar dates', () => {
    expect(dateWithYearRollback(31, 2, 19, 30, NOW)).toBeNull()
  })

  it('rolls the year back when the Vietnam date would be >183 days ahead', () => {
    const earlyNextYear = new Date(Date.UTC(2027, 0, 5, 1, 0)) // 08:00 VN 5/1/2027
    expect(parseTitle('19:30 21/11 ⚽ A vs B', earlyNextYear)?.kickoff?.getTime()).toBe(
      Date.UTC(2026, 10, 21, 12, 30),
    )
  })
})

describe('Vietnam wall-clock display', () => {
  it('renders Vietnam time regardless of the machine timezone', () => {
    const kickoff = new Date(Date.UTC(2026, 10, 21, 12, 30))
    expect(fmtTime(kickoff)).toBe('19:30')
    expect(fmtDate(kickoff)).toBe('21/11')
    expect(fmtDateTime(kickoff)).toBe('19:30 21/11')
  })

  it('renders the machine clock only when explicitly asked', () => {
    const kickoff = new Date(Date.UTC(2026, 10, 21, 12, 30))
    const local = new Date(kickoff)
    expect(fmtTime(kickoff, 'local')).toBe(
      `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
    )
    // 'vn' is the default zone, so the two only coincide on a UTC+7 machine.
    if (-new Date().getTimezoneOffset() !== 420) {
      expect(fmtTime(kickoff, 'local')).not.toBe('19:30')
    }
  })
})

describe('live detection on real instants', () => {
  it('is live for matches inside the 19:00–21:00 VN window at 19:45 VN', () => {
    const now = new Date(Date.UTC(2026, 10, 21, 12, 45)) // 19:45 VN
    // In progress: kicked off 19:00 VN (45') and 18:30 VN (75').
    expect(matchStatusAt(vn(21, 19, 0), now)).toBe('live')
    expect(matchStatusAt(vn(21, 18, 30), now)).toBe('live')
    expect(matchStatusAt(vn(21, 19, 45), now)).toBe('live') // window closes 22:00
    // Not started yet / already over.
    expect(matchStatusAt(vn(21, 22, 0), now)).toBe('upcoming')
    expect(matchStatusAt(vn(21, 16, 0), now)).toBe('ended')
  })

  it('is live for a 19:30 VN kickoff at 19:45 VN even though the machine is CST', () => {
    const now = new Date(Date.UTC(2026, 10, 21, 12, 45))
    const kickoff = parseTitle('🟢 19:30 21/11 ⚽ Manchester City vs Fulham', NOW)!.kickoff
    expect(kickoff.getTime() - now.getTime()).toBe(-15 * 60_000)
    expect(matchStatusAt(kickoff, now, '🟢')).toBe('live')
  })
})

describe('Vietnam day labels', () => {
  it('calls a 23:30 VN kickoff "Hôm nay" and 00:30 VN "Ngày mai" at 23:50 VN', () => {
    const now = vn(21, 23, 50) // 16:50Z on 21/11
    const lateNight = vn(21, 23, 30) // 16:30Z on 21/11
    const afterMidnight = new Date(Date.UTC(2026, 10, 21, 17, 30)) // 00:30 VN 22/11

    // Same machine-local (CST = UTC-6) calendar day: 10:30 and 11:30 on 21/11.
    expect(lateNight.getDate()).toBe(afterMidnight.getDate())
    expect(lateNight.getMonth()).toBe(afterMidnight.getMonth())

    expect(dayLabel(lateNight, now)).toBe('Hôm nay')
    expect(dayLabel(afterMidnight, now)).toBe('Ngày mai')
    // And the day filter arithmetic agrees.
    expect(calendarDayDiff(lateNight, now)).toBe(0)
    expect(calendarDayDiff(afterMidnight, now)).toBe(1)
    // A machine-local day comparison would get the second one wrong.
    if (-new Date().getTimezoneOffset() !== 420) {
      expect(lateNight.getDate()).toBe(afterMidnight.getDate())
      expect(dayLabel(afterMidnight, now, 'vn')).not.toBe(dayLabel(lateNight, now, 'vn'))
    }
  })
})