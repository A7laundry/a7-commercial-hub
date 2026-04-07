/**
 * Deterministic date/time formatters — output is identical on server and client.
 * Uses UTC methods to avoid timezone-dependent divergence.
 *
 * Use these instead of toLocaleDateString() / toLocaleString() in render paths.
 * For dynamic values (time elapsed, countdown), use suppressHydrationWarning on
 * the specific text node, not on container elements.
 */

export function formatDateBR(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const day   = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year  = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function formatDateTimeBR(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const day   = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year  = d.getUTCFullYear()
  const hours = String(d.getUTCHours()).padStart(2, "0")
  const mins  = String(d.getUTCMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${mins}`
}

export function formatTimeBR(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const hours = String(d.getUTCHours()).padStart(2, "0")
  const mins  = String(d.getUTCMinutes()).padStart(2, "0")
  return `${hours}:${mins}`
}

export function formatCurrencyBR(value: number): string {
  // Deterministic: always format manually, never rely on Intl/browser locale
  const abs = Math.abs(value)
  const formatted = abs.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `R$ ${value < 0 ? "-" : ""}${formatted}`
}
