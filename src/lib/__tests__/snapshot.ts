/**
 * Synthetic stand-in for a provider IPTV playlist.
 *
 * This repo used to ship a verbatim snapshot of a live provider playlist —
 * real stream URLs and somebody else's channel brands. That is not ours to
 * redistribute, so the suite now builds its own playlist instead: the same
 * shape (15 concatenated M3U documents, 730 `#EXTINF` blocks, 14 channel
 * brands, a freshness marker, dead `no-signal` entries, mixed formats), but
 * every URL is `example.test` and every brand name is invented.
 *
 * Counts live in `SNAPSHOT` and the builder throws when they drift, so the
 * numbers the tests assert are a contract rather than a fact about a file.
 */

export const SNAPSHOT = {
  documents: 15,
  extinfCount: 730,
  sourceCount: 729,
  groupCount: 14,
  groupTitlesIncludingMarker: 15,
  /** The literal string `no-signal` appears once per dead URL. */
  noSignalUrlCount: 200,
  noSignalSourceCount: 199,
  usableCount: 530,
  deadBrand: 'Kênh Chết TV',
  deadBrandSourceCount: 138,
  liveNoSignalCount: 61,
  referrerCount: 100,
  userAgentCount: 50,
  rtmpCount: 1,
  flvCount: 28,
  markerLabel: 'Updated 21/11 20:23',
  markerUtcMs: Date.UTC(2026, 10, 21, 13, 23),
  /** The fixture the grouping tests pin down. */
  pinnedKickoff: '19:30',
  pinnedHome: 'Manchester City',
  pinnedHomeShort: 'Man City',
  pinnedAway: 'Fulham',
} as const

const LIVE_BRANDS = Array.from(
  { length: SNAPSHOT.groupCount - 1 },
  (_, index) => `Kênh Test ${String(index + 1).padStart(2, '0')}`,
)

const NO_SIGNAL_URL = 'https://static.example.test/no-signal/low.m3u8'
const RTMP_URL = 'rtmp://live.example.test/live/vip'
const KICKOFFS = [
  '19:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
  '23:00',
  '23:30',
]

/**
 * 60 clubs walked as a cycle, so every fixture is a distinct pairing. Index 0
 * is the pinned Manchester City / Fulham tie; index 14 repeats the 19:30 slot
 * with two other clubs and must NOT merge with it.
 */
const CLUBS = [
  'Manchester City',
  'Fulham',
  'Arsenal',
  'Manchester United',
  'Chelsea',
  'Leeds United',
  'Tottenham Hotspur',
  'Ipswich Town',
  'Liverpool',
  'Everton',
  'Newcastle United',
  'Sunderland',
  'Aston Villa',
  'Nottingham Forest',
  'Millwall',
  'Queens Park Rangers',
  'S.S. Lazio',
  'Lecce',
  'OGC Nice',
  'Paris Saint Germain',
  'LOSC Lille',
  'Olympique Lyonnais',
  '1. FC Nürnberg',
  'Eintracht Braunschweig',
  'VfL Wolfsburg',
  'Holstein Kiel',
  'Borussia Mönchengladbach',
  'Borussia Dortmund',
  '1. FC Union Berlin',
  'RB Leipzig',
  'Bayer Leverkusen',
  'Bayern Munich',
  'Deportivo Alavés',
  'RC Deportivo',
  'Rayo Vallecano',
  'Valencia CF',
  'Sevilla FC',
  'Real Betis',
  'Real Madrid',
  'Galatasaray',
  'Santos Laguna',
  'Santos',
  'Inter Miami',
  'Internazionale',
  'Bologna',
  'Bolton',
  'AS Roma',
  'AJ Auxerre',
  'Coventry City',
  'Crystal Palace',
  'Bournemouth AFC',
  'Brentford',
  'Brighton & Hove Albion',
  'Southampton',
  'Derby County',
  'Stoke City',
  'Hull City',
  'Preston North End',
  'Blackburn Rovers',
  'Sheffield Wednesday',
]

const SPORTS = ['⚽', '⚽', '⚽', '⚽', '🥎', '🏀', '🎾', '⚽', '⚽', '⚽'] as const

const FIXTURE_COUNT = 60

interface Fixture {
  kickoff: string
  day: string
  sport: string
  home: string
  away: string
}

interface Entry {
  group: string
  title: string
  url: string
  options: string[]
}

function buildFixtures(): Fixture[] {
  return Array.from({ length: FIXTURE_COUNT }, (_, index) => ({
    kickoff: KICKOFFS[index % KICKOFFS.length],
    day: index < 42 ? '21/11' : '22/11',
    // The pinned fixture stays football so it collapses into one card.
    sport: index === 0 ? '⚽' : SPORTS[index % SPORTS.length],
    home: CLUBS[index % CLUBS.length],
    away: CLUBS[(index + 1) % CLUBS.length],
  }))
}

/** Spread `count` picks evenly over `total` positions (dead entries, no-signal). */
function spread(total: number, count: number): Set<number> {
  const picked = new Set<number>()
  for (let index = 0; index < count; index += 1) {
    picked.add(Math.floor((index * total) / count))
  }
  return picked
}

function titleFor(fixture: Fixture, home: string, sequence: number): string {
  const commentator = `BLV ${String.fromCharCode(65 + (sequence % 26))}${sequence % 7}`
  const tag = sequence % 5 === 0 ? ' [hls]' : ''
  return `🟢 ${fixture.kickoff} ${fixture.day} ${fixture.sport} ${home} vs ${fixture.away} (${commentator})${tag}`
}

function buildEntries(): Entry[] {
  const fixtures = buildFixtures()
  // The freshness marker: metadata, not a channel. Its URL is dead as well,
  // which is why the text carries one more `no-signal` string than it has dead
  // sources.
  const entries: Entry[] = [
    {
      group: SNAPSHOT.markerLabel,
      title: SNAPSHOT.markerLabel,
      url: NO_SIGNAL_URL,
      options: [],
    },
  ]

  const deadSlots = spread(SNAPSHOT.sourceCount, SNAPSHOT.deadBrandSourceCount)
  const liveCount = SNAPSHOT.sourceCount - SNAPSHOT.deadBrandSourceCount
  const liveDeadSlots = spread(liveCount, SNAPSHOT.liveNoSignalCount)

  let liveIndex = 0
  for (let slot = 0; slot < SNAPSHOT.sourceCount; slot += 1) {
    const fixture = fixtures[slot % fixtures.length]
    const inDeadBrand = deadSlots.has(slot)
    // Fixture 0 goes out under two spellings; the app must merge them.
    const home =
      slot % fixtures.length === 0 && (slot / fixtures.length) % 2 === 1
        ? SNAPSHOT.pinnedHomeShort
        : fixture.home
    const options: string[] = []
    if (!inDeadBrand && liveIndex < SNAPSHOT.referrerCount) {
      options.push(`#EXTVLCOPT:http-referrer=https://referrer.example.test/${liveIndex}`)
    }
    if (!inDeadBrand && liveIndex < SNAPSHOT.userAgentCount) {
      options.push('#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Test Client)')
    }

    let url: string
    if (inDeadBrand || liveDeadSlots.has(liveIndex)) {
      url = `${NO_SIGNAL_URL}?ch=${slot}`
    } else if (liveIndex === liveCount - 1) {
      url = RTMP_URL
    } else if (liveIndex % 21 === 5) {
      url = `https://stream.example.test/live/ch-${slot}.flv`
    } else {
      url = `https://stream.example.test/live/ch-${slot}.m3u8`
    }

    entries.push({
      group: inDeadBrand ? SNAPSHOT.deadBrand : LIVE_BRANDS[liveIndex % LIVE_BRANDS.length],
      title: titleFor(fixture, home, slot),
      url,
      options,
    })

    if (!inDeadBrand) liveIndex += 1
  }

  return entries
}

function render(entries: Entry[]): string {
  const perDocument = Math.ceil(entries.length / SNAPSHOT.documents)
  const chunks: string[] = []
  for (let start = 0; start < entries.length; start += perDocument) {
    const slice = entries.slice(start, start + perDocument)
    chunks.push(
      ['#EXTM3U', '', ...slice.flatMap((item) => [extinf(item), ...item.options, item.url, ''])].join(
        '\n',
      ),
    )
  }
  return chunks.join('\n')
}

function extinf(entry: Entry): string {
  return `#EXTINF:-1 tvg-logo="https://logos.example.test/team/${entry.title.length % 40}.png" group-title="${entry.group}" , ${entry.title}`
}

export function buildSnapshot(): string {
  const entries = buildEntries()

  const noSignalUrls = entries.filter((entry) => entry.url.includes('no-signal')).length
  if (noSignalUrls !== SNAPSHOT.noSignalUrlCount) {
    throw new Error(`snapshot drifted: ${noSignalUrls} no-signal URLs`)
  }
  if (entries.length !== SNAPSHOT.extinfCount) {
    throw new Error(`snapshot drifted: ${entries.length} #EXTINF blocks`)
  }

  return render(entries)
}

/** Cached: every test file imports the same text. */
let cached: string | null = null

export function snapshot(): string {
  if (cached === null) cached = buildSnapshot()
  return cached
}
