"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useTenant } from "@/hooks/useTenant"
import { createClient } from "@/lib/supabase/client"
import { updateUserProfile } from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, User, Mail, ShieldCheck, Camera } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
]

type UserProfile = {
  display_name: string | null
  job_title: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
}

function InitialsAvatar({
  name,
  email,
  size = 80,
}: {
  name?: string | null
  email: string
  size?: number
}) {
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : email[0].toUpperCase()

  const colorIndex = initials.charCodeAt(0) % AVATAR_COLORS.length

  return (
    <div
      className={`${AVATAR_COLORS[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ width: size, height: size }}
      aria-label={`Avatar de ${name || email}`}
    >
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const { currentUser, tenant } = useTenant()
  const supabase = createClient()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Profile fields
  const [displayName, setDisplayName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Password form
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }
      setUser(authUser)

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, job_title, phone, bio, avatar_url")
        .eq("user_id", authUser.id)
        .single()

      if (profile) {
        const p = profile as UserProfile
        setDisplayName(p.display_name ?? "")
        setJobTitle(p.job_title ?? "")
        setPhone(p.phone ?? "")
        setBio(p.bio ?? "")
        setAvatarUrl(p.avatar_url ?? null)
      }

      setLoading(false)
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Imagem muito grande. Tamanho máximo: 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido")
      return
    }

    setAvatarFile(file)
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
  }

  async function uploadAvatarAndGetUrl(userId: string, file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "jpg"
    const storagePath = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error("Erro ao enviar avatar: " + uploadError.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(storagePath)

    return publicUrl
  }

  function handleSaveProfile() {
    if (!user) return

    startTransition(async () => {
      setUploadingAvatar(true)
      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        const uploaded = await uploadAvatarAndGetUrl(user.id, avatarFile)
        if (!uploaded) {
          setUploadingAvatar(false)
          return
        }
        finalAvatarUrl = uploaded
        setAvatarUrl(uploaded)
        setAvatarFile(null)
      }

      setUploadingAvatar(false)

      const { error } = await updateUserProfile(user.id, {
        display_name: displayName,
        job_title: jobTitle,
        phone: phone,
        bio: bio,
        avatar_url: finalAvatarUrl ?? undefined,
      })

      if (error) {
        toast.error("Erro ao salvar: " + error)
      } else {
        toast.success("Perfil atualizado")
      }
    })
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error("Erro ao trocar senha: " + error.message)
    } else {
      toast.success("Senha alterada com sucesso")
      setNewPassword("")
      setConfirmPassword("")
    }
    setSavingPassword(false)
  }

  const isEmailProvider = user?.identities?.some((i) => i.provider === "email") ?? false
  const providers = user?.identities?.map((i) => i.provider) ?? []
  const isSaving = isPending || uploadingAvatar

  const currentAvatarSrc = avatarPreview ?? avatarUrl
  const displayNameForAvatar = displayName || user?.user_metadata?.full_name

  if (loading) {
    return (
      <>
        <PageHeader title="Perfil" description="Suas informações pessoais" />
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Perfil" description="Suas informações pessoais" />
      <div className="space-y-6 max-w-xl">

        {/* Avatar + profile fields */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Avatar section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {currentAvatarSrc ? (
                  <img
                    src={currentAvatarSrc}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar
                    name={displayNameForAvatar}
                    email={currentUser.email}
                    size={80}
                  />
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  aria-label="Alterar foto de perfil"
                >
                  <Camera className="w-3 h-3 text-muted-foreground" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  aria-label="Selecionar foto de perfil"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Foto de perfil</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF ou WebP — máx. 2MB
                </p>
                {avatarPreview && (
                  <p className="text-xs text-primary">Prévia carregada — salve para confirmar</p>
                )}
              </div>
            </div>

            {/* Read-only: email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={currentUser.email}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-default"
                />
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Controlado pelo provedor de autenticação
              </p>
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Como quer ser chamado</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome ou apelido"
              />
            </div>

            {/* Job title */}
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Cargo</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex: Gerente de Operações"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +55 11 99999-9999"
                type="tel"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio curta</Label>
                <span
                  className={`text-[11px] ${bio.length > 140 ? "text-amber-500" : "text-muted-foreground"}`}
                  aria-live="polite"
                >
                  {bio.length}/160
                </span>
              </div>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                rows={3}
                maxLength={160}
                className="resize-none"
              />
            </div>

            {/* Read-only: organization */}
            <div className="space-y-1.5">
              <Label>Organização</Label>
              <Input
                value={tenant.name}
                readOnly
                className="bg-muted text-muted-foreground cursor-default"
              />
            </div>

            {/* Read-only: role */}
            <div className="space-y-1.5">
              <Label>Função na organização</Label>
              <div>
                <Badge variant="secondary">
                  {ROLE_LABEL[currentUser.role] ?? currentUser.role}
                </Badge>
              </div>
            </div>

            {/* Login providers */}
            <div className="space-y-1.5">
              <Label>Login via</Label>
              <div className="flex gap-2 flex-wrap">
                {providers.map((p) => (
                  <Badge key={p} variant="outline" className="capitalize gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    {p === "email" ? "Email / senha" : p}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              size="sm"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        {/* Password change — only for email provider */}
        {isEmailProvider && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Trocar senha</CardTitle>
              <CardDescription>Defina uma nova senha para sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
                size="sm"
                variant="outline"
              >
                {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
