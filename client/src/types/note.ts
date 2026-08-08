// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  is_archived: number;
  tags: string; // JSON string of string[]
  folder_id: string | null;
  is_locked?: number;
  pin_hash?: string | null;
  has_pin?: boolean;
  created_at: string;
  updated_at: string;
}

// create note dto
export interface CreateNoteDto {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
  folder_id?: string | null;
  is_locked?: number;
  pin_hash?: string | null;
}

// update note dto
export interface UpdateNoteDto {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
  folder_id?: string | null;
  is_locked?: number;
  pin_hash?: string | null;
}

// api error response interface
export interface ApiError {
  message: string;
  details?: string[];
}
