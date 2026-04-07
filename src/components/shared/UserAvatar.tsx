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

const AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
]

function getAvatarColor(seed: string): string {
  if (!seed) return AVATAR_COLORS[0]
  const code = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
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
  const colorClass = getAvatarColor(displayName ?? email ?? "")
  const initials = getInitials(displayName, email)

  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName ?? email ?? "Avatar"}
        style={style}
        className={cn("rounded-full object-cover shrink-0", className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span
      style={style}
      aria-label={displayName ?? email ?? "Avatar"}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold leading-none select-none shrink-0",
        colorClass,
        className
      )}
    >
      {initials}
    </span>
  )
}
