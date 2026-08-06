// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// create note payload
export interface CreateNotePayload {
  title: string;
  content: string;
}

// update note payload
export interface UpdateNotePayload {
  title?: string;
  content?: string;
}

// api error response
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
