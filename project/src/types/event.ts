export type EventStatus = 'upcoming' | 'available' | 'finished';

export interface EventSection {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreEvent {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  modality: string | null;
  status: EventStatus | string | null;
  capacity: string | null;
  whatsapp_message: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sections?: EventSection[];
}

export interface EventSectionInput {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface EventInput {
  title: string;
  slug?: string;
  short_description: string;
  description: string;
  image_url: string;
  event_date: string;
  event_time: string;
  location: string;
  modality: string;
  status: EventStatus;
  capacity: string;
  whatsapp_message: string;
  is_active: boolean;
  sort_order: number;
  sections: EventSectionInput[];
  deletedSectionIds?: string[];
}
