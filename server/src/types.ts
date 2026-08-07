// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

// create note payload
export interface CreateNotePayload {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
}

// update note payload
export interface UpdateNotePayload {
  title?: string;
  content?: string;
  category?: string;
  is_pinned?: number;
}

// api error response
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
