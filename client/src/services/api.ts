import axios, { AxiosError } from 'axios';
import type { Note, CreateNoteDto, UpdateNoteDto, ApiError } from '../types/note';
import type { Folder, CreateFolderDto, UpdateFolderDto } from '../types/folder';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api'
);

// axios instance setup
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// extract error message
function formatError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; details?: string[] }>;
    if (axiosError.response?.data?.error) {
      return {
        message: axiosError.response.data.error,
        details: axiosError.response.data.details
      };
    }
    if (axiosError.code === 'ECONNABORTED') {
      return { message: 'request timed out. server did not respond.' };
    }
    if (!axiosError.response) {
      return { message: 'unable to connect to backend server. check if backend is running.' };
    }
    return { message: axiosError.message || 'an unexpected network error occurred.' };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'an unknown error occurred.' };
}

// ─── notes ───────────────────────────────────────────────────────

export async function getNotes(): Promise<Note[]> {
  try {
    const response = await apiClient.get<Note[]>('/notes');
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function getNoteById(id: string): Promise<Note> {
  try {
    const response = await apiClient.get<Note>(`/notes/${id}`);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function createNote(dto: CreateNoteDto): Promise<Note> {
  try {
    const response = await apiClient.post<Note>('/notes', dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function updateNote(id: string, dto: UpdateNoteDto): Promise<Note> {
  try {
    const response = await apiClient.put<Note>(`/notes/${id}`, dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await apiClient.delete(`/notes/${id}`);
  } catch (error) {
    throw formatError(error);
  }
}

export async function verifyNotePin(id: string, pin: string): Promise<boolean> {
  try {
    const response = await apiClient.post<{ success: boolean }>(`/notes/${id}/verify-pin`, { pin });
    return response.data.success;
  } catch (error) {
    throw formatError(error);
  }
}

// ─── folders ─────────────────────────────────────────────────────

export async function getFolders(): Promise<Folder[]> {
  try {
    const response = await apiClient.get<Folder[]>('/folders');
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function createFolder(dto: CreateFolderDto): Promise<Folder> {
  try {
    const response = await apiClient.post<Folder>('/folders', dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function updateFolder(id: string, dto: UpdateFolderDto): Promise<Folder> {
  try {
    const response = await apiClient.put<Folder>(`/folders/${id}`, dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function deleteFolder(id: string): Promise<void> {
  try {
    await apiClient.delete(`/folders/${id}`);
  } catch (error) {
    throw formatError(error);
  }
}

export async function verifyFolderPin(id: string, pin: string): Promise<boolean> {
  try {
    const response = await apiClient.post<{ success: boolean }>(`/folders/${id}/verify-pin`, { pin });
    return response.data.success;
  } catch (error) {
    throw formatError(error);
  }
}

// ─── security question settings ───────────────────────────────────

export async function getSecurityQuestion(): Promise<{ configured: boolean; question?: string }> {
  try {
    const response = await apiClient.get<{ configured: boolean; question?: string }>('/settings/security-question');
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

export async function setSecurityQuestion(question: string, answer: string): Promise<void> {
  try {
    await apiClient.post('/settings/security-question', { question, answer });
  } catch (error) {
    throw formatError(error);
  }
}

export async function resetFolderPin(id: string, answer: string): Promise<boolean> {
  try {
    const response = await apiClient.post<{ success: boolean }>((`/folders/${id}/reset-pin`), { answer });
    return response.data.success;
  } catch (error) {
    throw formatError(error);
  }
}

export async function resetNotePin(id: string, answer: string): Promise<boolean> {
  try {
    const response = await apiClient.post<{ success: boolean }>(`/notes/${id}/reset-pin`, { answer });
    return response.data.success;
  } catch (error) {
    throw formatError(error);
  }
}
