export type TenantRole = "owner" | "admin" | "member" | "viewer"

export type Tenant = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type TenantUser = {
  id: string
  tenant_id: string
  user_id: string
  role: TenantRole
  created_at: string
}

export type AccountStatus = "active" | "inactive" | "prospect"

export type Account = {
  id: string
  tenant_id: string
  name: string
  segment: string | null
  contact_name: string | null
  contact_email: string | null
  status: AccountStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type ContractStatus = "draft" | "active" | "expiring" | "expired" | "cancelled"

export type Contract = {
  id: string
  tenant_id: string
  account_id: string
  title: string
  status: ContractStatus
  currency: string
  total_value: number
  starts_at: string
  ends_at: string
  auto_renew: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  account_name?: string
}

export type DocumentStatus = "valid" | "expiring" | "expired" | "no_expiry"

export type Document = {
  id: string
  tenant_id: string
  account_id: string | null
  contract_id: string | null
  name: string
  doc_type: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  expires_at: string | null
  version: number
  uploaded_by: string
  created_at: string
}

export type AlertType =
  | "contract_expiring_soon"
  | "contract_expired"
  | "document_missing"

export type AlertSeverity = "info" | "warning" | "critical"
export type AlertStatus = "open" | "acknowledged" | "resolved"

export type Alert = {
  id: string
  tenant_id: string
  account_id: string | null
  contract_id: string | null
  type: AlertType
  severity: AlertSeverity
  title: string
  status: AlertStatus
  created_at: string
  // joined
  account_name?: string
}
