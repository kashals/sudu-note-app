// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  is_archived: number;
  tags: string; // JSON string representation of string[]
  created_at: string;
  updated_at: string;
}

// create note payload
export interface CreateNotePayload {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
}

// update note payload
export interface UpdateNotePayload {
  title?: string;
  content?: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
}

// api error response
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
