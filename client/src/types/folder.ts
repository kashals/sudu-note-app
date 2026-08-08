export interface Folder {
  id: string;
  name: string;
  color: string;
  is_locked: number; // 0 or 1
  has_pin: boolean;
  note_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderDto {
  name: string;
  color: string;
  is_locked?: number;
  pin_hash?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string;
  is_locked?: number;
  pin_hash?: string | null;
}
