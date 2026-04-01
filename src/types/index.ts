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

// ── CRM Pipeline ─────────────────────────────────────────────────────────────

export type PipelineStage =
  | "lead"
  | "in_service"
  | "quote_sent"
  | "negotiating"
  | "closed"
  | "recurring"

export type CommercialStatus = "active" | "at_risk" | "lost"

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
  // CRM pipeline fields
  pipeline_stage: PipelineStage
  commercial_status: CommercialStatus
  last_contact_at: string | null
  next_action: string | null
  estimated_value: number | null
  frequency: string | null
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

// ── WhatsApp ──────────────────────────────────────────────────────────────────

export type WhatsAppMessage = {
  id: string
  tenant_id: string
  account_id: string | null
  phone: string
  message_text: string
  direction: "inbound" | "outbound"
  wa_message_id: string | null
  received_at: string
  processed: boolean
  created_at: string
}

export type PhoneMapping = {
  id: string
  tenant_id: string
  phone: string
  account_id: string
  created_at: string
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export type CampaignType =
  | "reactivation"
  | "upsell"
  | "follow_up"
  | "renewal"
  | "custom"
  | "birthday"
  | "risk"
  | "acquisition"
  | "recurrence"
export type CampaignStatus = "draft" | "active" | "completed" | "cancelled"
export type CampaignRecipientStatus = "pending" | "sent" | "failed" | "no_phone"

export type Campaign = {
  id: string
  tenant_id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  message_template: string
  recipient_count: number
  sent_count: number
  created_at: string
  executed_at: string | null
}

export type CampaignRecipient = {
  id: string
  tenant_id: string
  campaign_id: string
  account_id: string
  phone: string | null
  status: CampaignRecipientStatus
  sent_at: string | null
  created_at: string
}

// ── Portal ────────────────────────────────────────────────────────────────────

export type PortalClient = {
  id: string
  tenant_id: string
  account_id: string
  user_id: string | null
  email: string
  name: string | null
  active: boolean
  created_at: string
}

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled"

export type Invoice = {
  id: string
  tenant_id: string
  account_id: string
  contract_id: string | null
  title: string
  amount: number
  status: InvoiceStatus
  due_date: string
  paid_at: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

// ── Automation ────────────────────────────────────────────────────────────────

export type AutomationTriggerType = "upsell" | "cross_sell" | "remarketing" | "reactivation"
export type AutomationTriggerStatus = "pending" | "fired" | "dismissed"

export type AutomationTrigger = {
  id: string
  tenant_id: string
  account_id: string | null
  type: AutomationTriggerType
  status: AutomationTriggerStatus
  reason: string | null
  scheduled_for: string | null
  fired_at: string | null
  created_at: string
}
