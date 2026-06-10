export type SitePopupResponse = 'accepted' | 'dismissed' | 'closed';

export type SitePopupAcceptAction = 'dismiss' | 'link' | 'whatsapp';

export interface SitePopup {
  id: string;
  title: string;
  description: string | null;
  accept_label: string;
  dismiss_label: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  accept_action: SitePopupAcceptAction;
  accept_link_url: string | null;
  accept_whatsapp_message: string | null;
  campaign_key: string;
  is_active: boolean;
  show_once: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SitePopupInput {
  title: string;
  description: string;
  accept_label: string;
  dismiss_label: string;
  image_url: string;
  link_url: string;
  link_label: string;
  accept_action: SitePopupAcceptAction;
  accept_link_url: string;
  accept_whatsapp_message: string;
  campaign_key: string;
  is_active: boolean;
  show_once: boolean;
  starts_at: string;
  ends_at: string;
  sort_order: number | string;
}

export interface SitePopupPreference {
  popupId: string;
  campaignKey: string;
  response: SitePopupResponse;
  respondedAt: string;
}
