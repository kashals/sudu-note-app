import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from './db.js';
import { Note, Folder } from './types.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// security middleware
app.use(helmet());

// cors configuration
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'x-device-id']
  })
);

// body parser
app.use(express.json({ limit: '1mb' }));

// ─── validation schemas ───────────────────────────────────────────
const createNoteSchema = z.object({
  title: z.string().max(200, 'title too long (max 200 characters)').default(''),
  content: z.string().max(10000, 'content too long (max 10000 characters)').default(''),
  category: z.string().trim().max(50).default('Personal'),
  is_pinned: z.number().int().min(0).max(1).default(0),
  is_archived: z.number().int().min(0).max(1).default(0),
  tags: z.string().default('[]'),
  folder_id: z.string().uuid().nullable().optional(),
  is_locked: z.number().int().min(0).max(1).default(0),
  pin_hash: z.string().nullable().optional()
});

const updateNoteSchema = z.object({
  title: z.string().max(200, 'title too long (max 200 characters)').optional(),
  content: z.string().max(10000, 'content too long (max 10000 characters)').optional(),
  category: z.string().trim().max(50).optional(),
  is_pinned: z.number().int().min(0).max(1).optional(),
  is_archived: z.number().int().min(0).max(1).optional(),
  tags: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  is_locked: z.number().int().min(0).max(1).optional(),
  pin_hash: z.string().nullable().optional()
});

const createFolderSchema = z.object({
  name: z.string().min(1, 'name required').max(30, 'name too long (max 30 characters)').trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid color hex').default('#3b82f6'),
  is_locked: z.number().int().min(0).max(1).default(0),
  pin_hash: z.string().nullable().optional()
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(30, 'name too long (max 30 characters)').trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_locked: z.number().int().min(0).max(1).optional(),
  pin_hash: z.string().nullable().optional()
});

// ─── helpers ─────────────────────────────────────────────────────
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function getDeviceId(req: Request): string {
  const header = req.headers['x-device-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  return 'default-device';
}

// ─── health ───────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── notes ───────────────────────────────────────────────────────

// fetch all notes
app.get('/api/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const notes = await db.all<Note[]>(
      'SELECT id, title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash, created_at, updated_at FROM notes WHERE device_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [deviceId]
    );
    const formatted = notes.map(n => ({
      ...n,
      is_locked: n.is_locked || 0,
      has_pin: Boolean(n.pin_hash)
    }));
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// fetch single note
app.get('/api/notes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const note = await db.get<Note>(
      'SELECT id, title, content, category, is_pinned, is_archived, tags, folder_id, created_at, updated_at FROM notes WHERE id = ? AND device_id = ?',
      [id, deviceId]
    );

    if (!note) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
});

// create note
app.post('/api/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const parseResult = createNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const { title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash } = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const processedPinHash = pin_hash && pin_hash.length === 4 ? hashPin(pin_hash) : (pin_hash || null);
    const processedIsLocked = is_locked !== undefined ? is_locked : (processedPinHash ? 1 : 0);

    const db = await getDb();
    await db.run(
      'INSERT INTO notes (id, title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash, device_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, content, category, is_pinned, is_archived, tags, folder_id ?? null, processedIsLocked, processedPinHash, deviceId, now, now]
    );

    const newNote: Note = {
      id, title, content, category, is_pinned, is_archived, tags,
      folder_id: folder_id ?? null,
      is_locked: processedIsLocked,
      pin_hash: processedPinHash,
      has_pin: Boolean(processedPinHash),
      created_at: now,
      updated_at: now
    };

    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
});

// update note
app.put('/api/notes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const parseResult = updateNoteSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const db = await getDb();
    const existingNote = await db.get<Note>(
      'SELECT id, category, is_pinned, is_archived, tags, folder_id, pin_hash FROM notes WHERE id = ? AND device_id = ?',
      [id, deviceId]
    );

    if (!existingNote) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    const { title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash } = parseResult.data;
    const finalCategory = category !== undefined ? category : existingNote.category;
    const finalIsPinned = is_pinned !== undefined ? is_pinned : existingNote.is_pinned;
    const finalIsArchived = is_archived !== undefined ? is_archived : existingNote.is_archived;
    const finalTags = tags !== undefined ? tags : existingNote.tags;
    const finalFolderId = folder_id !== undefined ? folder_id : existingNote.folder_id;
    let finalPinHash = existingNote.pin_hash;
    if (pin_hash !== undefined) {
      finalPinHash = pin_hash && pin_hash.length === 4 ? hashPin(pin_hash) : pin_hash;
    }
    const finalIsLocked = is_locked !== undefined ? is_locked : (finalPinHash ? 1 : 0);
    const now = new Date().toISOString();

    await db.run(
      'UPDATE notes SET title = COALESCE(?, title), content = COALESCE(?, content), category = ?, is_pinned = ?, is_archived = ?, tags = ?, folder_id = ?, is_locked = ?, pin_hash = ?, updated_at = ? WHERE id = ? AND device_id = ?',
      [title ?? null, content ?? null, finalCategory, finalIsPinned, finalIsArchived, finalTags, finalFolderId, finalIsLocked, finalPinHash, now, id, deviceId]
    );

    const updatedNote = await db.get<Note>(
      'SELECT id, title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash, created_at, updated_at FROM notes WHERE id = ? AND device_id = ?',
      [id, deviceId]
    );

    res.json({
      ...updatedNote,
      is_locked: updatedNote?.is_locked || 0,
      has_pin: Boolean(updatedNote?.pin_hash)
    });
  } catch (error) {
    next(error);
  }
});

// verify note pin
app.post('/api/notes/:id/verify-pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      res.status(400).json({ error: 'pin is required' });
      return;
    }
    const db = await getDb();
    const note = await db.get<Note>('SELECT pin_hash FROM notes WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!note) {
      res.status(404).json({ error: 'note not found' });
      return;
    }
    if (!note.pin_hash) {
      res.json({ success: true });
      return;
    }
    const success = hashPin(pin) === note.pin_hash;
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// delete note
app.delete('/api/notes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const existingNote = await db.get<Note>('SELECT id FROM notes WHERE id = ? AND device_id = ?', [id, deviceId]);

    if (!existingNote) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    await db.run('DELETE FROM notes WHERE id = ? AND device_id = ?', [id, deviceId]);
    res.status(200).json({ message: 'note deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// ─── folders ─────────────────────────────────────────────────────

// fetch all folders with note counts
app.get('/api/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const folders = await db.all<(Folder & { note_count: number })[]>(`
      SELECT f.id, f.name, f.color, f.is_locked, f.pin_hash, f.created_at, f.updated_at,
             COUNT(n.id) as note_count
      FROM folders f
      LEFT JOIN notes n ON n.folder_id = f.id AND n.is_archived = 0 AND n.device_id = ?
      WHERE f.device_id = ?
      GROUP BY f.id
      ORDER BY f.created_at ASC
    `, [deviceId, deviceId]);
    // never expose pin_hash to client
    const safe = folders.map(({ pin_hash, ...rest }) => ({
      ...rest,
      has_pin: pin_hash !== null
    }));
    res.json(safe);
  } catch (error) {
    next(error);
  }
});

// create folder
app.post('/api/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const parseResult = createFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const { name, color, is_locked, pin_hash } = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const storedHash = pin_hash ? hashPin(pin_hash) : null;

    const db = await getDb();
    await db.run(
      'INSERT INTO folders (id, name, color, is_locked, pin_hash, device_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, color, is_locked, storedHash, deviceId, now, now]
    );

    res.status(201).json({
      id, name, color, is_locked,
      has_pin: storedHash !== null,
      note_count: 0,
      created_at: now,
      updated_at: now
    });
  } catch (error) {
    next(error);
  }
});

// update folder (rename, change color, lock/unlock)
app.put('/api/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const parseResult = updateFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const db = await getDb();
    const existing = await db.get<Folder>('SELECT * FROM folders WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!existing) {
      res.status(404).json({ error: 'folder not found' });
      return;
    }

    const { name, color, is_locked, pin_hash } = parseResult.data;
    const finalName = name ?? existing.name;
    const finalColor = color ?? existing.color;
    const finalIsLocked = is_locked ?? existing.is_locked;
    const finalPinHash = pin_hash !== undefined
      ? (pin_hash === null ? null : hashPin(pin_hash))
      : existing.pin_hash;

    const now = new Date().toISOString();

    await db.run(
      'UPDATE folders SET name = ?, color = ?, is_locked = ?, pin_hash = ?, updated_at = ? WHERE id = ? AND device_id = ?',
      [finalName, finalColor, finalIsLocked, finalPinHash, now, id, deviceId]
    );

    const noteCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE folder_id = ? AND is_archived = 0 AND device_id = ?',
      [id, deviceId]
    );

    res.json({
      id, name: finalName, color: finalColor, is_locked: finalIsLocked,
      has_pin: finalPinHash !== null,
      note_count: noteCount?.count ?? 0,
      created_at: existing.created_at,
      updated_at: now
    });
  } catch (error) {
    next(error);
  }
});

// delete folder — deletes folder and all notes inside it
app.delete('/api/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const existing = await db.get<Folder>('SELECT id FROM folders WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!existing) {
      res.status(404).json({ error: 'folder not found' });
      return;
    }

    // Delete all notes inside this folder
    await db.run('DELETE FROM notes WHERE folder_id = ? AND device_id = ?', [id, deviceId]);
    // Delete folder
    await db.run('DELETE FROM folders WHERE id = ? AND device_id = ?', [id, deviceId]);

    res.json({ message: 'folder and its contents deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// verify folder PIN — returns { success: boolean }
app.post('/api/folders/:id/verify-pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const { pin } = req.body as { pin?: string };

    if (!pin || typeof pin !== 'string') {
      res.status(400).json({ error: 'pin required' });
      return;
    }

    const db = await getDb();
    const folder = await db.get<{ pin_hash: string | null }>('SELECT pin_hash FROM folders WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!folder) {
      res.status(404).json({ error: 'folder not found' });
      return;
    }

    if (!folder.pin_hash) {
      res.status(400).json({ error: 'folder has no pin' });
      return;
    }

    const success = hashPin(pin) === folder.pin_hash;
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// ─── settings/security-question ───────────────────────────────────

// check if security question is set
app.get('/api/settings/security-question', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const db = await getDb();
    const questionRow = await db.get<{ value: string }>('SELECT value FROM system_settings WHERE key = ? AND device_id = ?', ['security_question', deviceId]);
    
    if (!questionRow) {
      res.json({ configured: false });
      return;
    }

    res.json({ configured: true, question: questionRow.value });
  } catch (error) {
    next(error);
  }
});

// configure security question & answer
app.post('/api/settings/security-question', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = getDeviceId(req);
    const { question, answer } = req.body as { question?: string; answer?: string };
    
    if (!question || !answer || typeof question !== 'string' || typeof answer !== 'string') {
      res.status(400).json({ error: 'question and answer required' });
      return;
    }

    const cleanQuestion = question.trim();
    const cleanAnswerHash = hashPin(answer.trim().toLowerCase());

    const db = await getDb();
    await db.run('DELETE FROM system_settings WHERE key = ? AND device_id = ?', ['security_question', deviceId]);
    await db.run('INSERT INTO system_settings (key, value, device_id) VALUES (?, ?, ?)', ['security_question', cleanQuestion, deviceId]);
    
    await db.run('DELETE FROM system_settings WHERE key = ? AND device_id = ?', ['security_answer_hash', deviceId]);
    await db.run('INSERT INTO system_settings (key, value, device_id) VALUES (?, ?, ?)', ['security_answer_hash', cleanAnswerHash, deviceId]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// reset folder PIN via security question answer
app.post('/api/folders/:id/reset-pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const { answer } = req.body as { answer?: string };

    if (!answer || typeof answer !== 'string') {
      res.status(400).json({ error: 'answer required' });
      return;
    }

    const db = await getDb();
    const storedAnswerHashRow = await db.get<{ value: string }>('SELECT value FROM system_settings WHERE key = ? AND device_id = ?', ['security_answer_hash', deviceId]);
    
    if (!storedAnswerHashRow) {
      res.status(400).json({ error: 'security question not configured' });
      return;
    }

    const incomingHash = hashPin(answer.trim().toLowerCase());
    
    if (incomingHash !== storedAnswerHashRow.value) {
      res.json({ success: false, error: 'incorrect answer' });
      return;
    }

    const folder = await db.get<{ id: string }>('SELECT id FROM folders WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!folder) {
      res.status(404).json({ error: 'folder not found' });
      return;
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE folders SET is_locked = 0, pin_hash = NULL, updated_at = ? WHERE id = ? AND device_id = ?',
      [now, id, deviceId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// reset note PIN via security question answer
app.post('/api/notes/:id/reset-pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = getDeviceId(req);
    const { answer } = req.body as { answer?: string };

    if (!answer || typeof answer !== 'string') {
      res.status(400).json({ error: 'answer required' });
      return;
    }

    const db = await getDb();
    const storedAnswerHashRow = await db.get<{ value: string }>('SELECT value FROM system_settings WHERE key = ? AND device_id = ?', ['security_answer_hash', deviceId]);
    
    if (!storedAnswerHashRow) {
      res.status(400).json({ error: 'security question not configured' });
      return;
    }

    const incomingHash = hashPin(answer.trim().toLowerCase());
    
    if (incomingHash !== storedAnswerHashRow.value) {
      res.json({ success: false, error: 'incorrect answer' });
      return;
    }

    const note = await db.get<{ id: string }>('SELECT id FROM notes WHERE id = ? AND device_id = ?', [id, deviceId]);
    if (!note) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE notes SET is_locked = 0, pin_hash = NULL, updated_at = ? WHERE id = ? AND device_id = ?',
      [now, id, deviceId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── catch-all & error handler ────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('server error:', err.message);
  res.status(500).json({ error: 'internal server error' });
});

// start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`server running on http://0.0.0.0:${PORT}`);
});
