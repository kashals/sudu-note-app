export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  is_archived: number;
  tags: string;
  folder_id: string | null;
  is_locked?: number;
  pin_hash?: string | null;
  has_pin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  is_locked: number;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNotePayload {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
  folder_id?: string | null;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
  folder_id?: string | null;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
