import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from './db.js';
import { Note } from './types.js';

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
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// body parser
app.use(express.json({ limit: '1mb' }));

// validation schemas
const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title cannot be empty')
    .max(200, 'title too long (max 200 characters)'),
  content: z
    .string()
    .trim()
    .min(1, 'content cannot be empty')
    .max(10000, 'content too long (max 10000 characters)'),
  category: z
    .string()
    .trim()
    .max(50)
    .default('Document'),
  is_pinned: z
    .number()
    .int()
    .min(0)
    .max(1)
    .default(0)
});

const updateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title cannot be empty')
    .max(200, 'title too long (max 200 characters)'),
  content: z
    .string()
    .trim()
    .min(1, 'content cannot be empty')
    .max(10000, 'content too long (max 10000 characters)'),
  category: z
    .string()
    .trim()
    .max(50)
    .optional(),
  is_pinned: z
    .number()
    .int()
    .min(0)
    .max(1)
    .optional()
});

// health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// fetch all notes
app.get('/api/notes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDb();
    const notes = await db.all<Note[]>(
      'SELECT id, title, content, category, is_pinned, created_at, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC'
    );
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// fetch single note
app.get('/api/notes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const note = await db.get<Note>(
      'SELECT id, title, content, category, is_pinned, created_at, updated_at FROM notes WHERE id = ?',
      [id]
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
    const parseResult = createNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const { title, content, category, is_pinned } = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const db = await getDb();
    await db.run(
      'INSERT INTO notes (id, title, content, category, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, content, category, is_pinned, now, now]
    );

    const newNote: Note = {
      id,
      title,
      content,
      category,
      is_pinned,
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
    const parseResult = updateNoteSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation failed',
        details: parseResult.error.errors.map((e) => e.message)
      });
      return;
    }

    const db = await getDb();
    const existingNote = await db.get<Note>('SELECT id, category, is_pinned FROM notes WHERE id = ?', [id]);

    if (!existingNote) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    const { title, content, category, is_pinned } = parseResult.data;
    const finalCategory = category !== undefined ? category : existingNote.category;
    const finalIsPinned = is_pinned !== undefined ? is_pinned : existingNote.is_pinned;
    const now = new Date().toISOString();

    await db.run(
      'UPDATE notes SET title = ?, content = ?, category = ?, is_pinned = ?, updated_at = ? WHERE id = ?',
      [title, content, finalCategory, finalIsPinned, now, id]
    );

    const updatedNote = await db.get<Note>(
      'SELECT id, title, content, category, is_pinned, created_at, updated_at FROM notes WHERE id = ?',
      [id]
    );

    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
});

// delete note
app.delete('/api/notes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existingNote = await db.get<Note>('SELECT id FROM notes WHERE id = ?', [id]);

    if (!existingNote) {
      res.status(404).json({ error: 'note not found' });
      return;
    }

    await db.run('DELETE FROM notes WHERE id = ?', [id]);
    res.status(200).json({ message: 'note deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'route not found' });
});

// error handler middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('server error:', err.message);
  res.status(500).json({
    error: 'internal server error'
  });
});

// start server
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
