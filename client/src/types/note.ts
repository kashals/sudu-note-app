// note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// create note dto
export interface CreateNoteDto {
  title: string;
  content: string;
}

// update note dto
export interface UpdateNoteDto {
  title: string;
  content: string;
}

// api error response interface
export interface ApiError {
  message: string;
  details?: string[];
}
