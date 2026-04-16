"use client"

import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type UserAvatarProps = {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string
  size?: number // px, default 32
  className?: string
}

// ── Color palette — deterministic by char code ────────────────────────────────
// Rich premium palette: background + text pairs (hex, safe for inline styles)

const AVATAR_PALETTE: { bg: string; text: string }[] = [
  { bg: "#1E3A5F", text: "#FFFFFF" }, // navy
  { bg: "#0A7251", text: "#FFFFFF" }, // forest green
  { bg: "#6D28D9", text: "#FFFFFF" }, // violet
  { bg: "#B45309", text: "#FFFFFF" }, // amber dark
  { bg: "#9F1239", text: "#FFFFFF" }, // crimson
  { bg: "#0369A1", text: "#FFFFFF" }, // ocean blue
  { bg: "#065F46", text: "#FFFFFF" }, // deep emerald
  { bg: "#7C2D12", text: "#FFFFFF" }, // rust
]

function getAvatarColor(seed: string): { bg: string; text: string } {
  if (!seed) return AVATAR_PALETTE[0]
  const code = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

// ── Initials derivation ───────────────────────────────────────────────────────

function getInitials(displayName?: string | null, email?: string): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  if (email) return email.charAt(0).toUpperCase()
  return "?"
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Reusable avatar component. Shows a circular image when avatarUrl is provided,
 * otherwise falls back to initials rendered in a deterministic colored circle.
 *
 * @example
 * <UserAvatar avatarUrl={profile.avatar_url} displayName={profile.display_name} size={40} />
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  email,
  size = 32,
  className,
}: UserAvatarProps) {
  const { bg, text } = getAvatarColor(displayName ?? email ?? "")
  const initials = getInitials(displayName, email)

  const baseStyle = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName ?? email ?? "Avatar"}
        style={baseStyle}
        className={cn("rounded-full object-cover shrink-0", className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span
      style={{ ...baseStyle, backgroundColor: bg, color: text }}
      aria-label={displayName ?? email ?? "Avatar"}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold leading-none select-none shrink-0",
        className
      )}
    >
      {initials}
    </span>
  )
}
