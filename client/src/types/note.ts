// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  is_archived: number;
  tags: string; // JSON string of string[]
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
}

// update note dto
export interface UpdateNoteDto {
  title: string;
  content: string;
  category?: string;
  is_pinned?: number;
  is_archived?: number;
  tags?: string;
}

// api error response interface
export interface ApiError {
  message: string;
  details?: string[];
}
