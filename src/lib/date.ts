/**
 * Local date utilities — always use these instead of toISOString().slice(0,10).
 *
 * toISOString() returns UTC. In Brazil (UTC-3), after 21:00 local time the UTC
 * date advances to the next day, causing date mismatches in daily queries.
 *
 * toLocaleDateString("sv") uses the Swedish locale which formats as YYYY-MM-DD
 * in the browser/Node local timezone. Stable across all modern V8 environments.
 */

export function localDateIso(): string {
  return new Date().toLocaleDateString("sv")
}

export function yesterdayIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString("sv")
}

export function addDaysToIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString("sv")
}
