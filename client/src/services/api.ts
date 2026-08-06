import axios, { AxiosError } from 'axios';
import type { Note, CreateNoteDto, UpdateNoteDto, ApiError } from '../types/note';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

// fetch all notes
export async function getNotes(): Promise<Note[]> {
  try {
    const response = await apiClient.get<Note[]>('/notes');
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

// fetch note by id
export async function getNoteById(id: string): Promise<Note> {
  try {
    const response = await apiClient.get<Note>(`/notes/${id}`);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

// create note
export async function createNote(dto: CreateNoteDto): Promise<Note> {
  try {
    const response = await apiClient.post<Note>('/notes', dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

// update note
export async function updateNote(id: string, dto: UpdateNoteDto): Promise<Note> {
  try {
    const response = await apiClient.put<Note>(`/notes/${id}`, dto);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
}

// delete note
export async function deleteNote(id: string): Promise<void> {
  try {
    await apiClient.delete(`/notes/${id}`);
  } catch (error) {
    throw formatError(error);
  }
}
