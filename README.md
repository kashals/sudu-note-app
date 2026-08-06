# SUDU Simple File Management System 📂

Full Stack Note Management Application built for the **SUDU.AI Intern Full-Stack Web Developer Pre-Task**.

Developer: **Aakash Pai**  
Tech Stack: **Vue 3 + TypeScript + Node.js/Express + SQLite + Tailwind CSS + Docker**

---

## 🌟 Overview & Architecture

This application is a production-grade full-stack file/note management system demonstrating rock-solid CRUD functionality, input validation, security hygiene, and a minimalist engineering user interface.

### Key Highlights

- **Frontend (`/client`)**: Vue 3 (Composition API) with TypeScript, Vite, Tailwind CSS v4, and `@lucide/vue` icons. Features responsive grid/list layouts, search filtering, character counters, real-time validation, and deletion confirmation dialogs.
- **Backend (`/server`)**: Node.js & Express API written in TypeScript. Uses SQLite with parameterized SQL queries to prevent SQL injection vulnerabilities.
- **Security Hygiene**: HTTP security headers via `helmet`, explicit `cors` configuration, double-layered validation (Zod on backend, reactive rules on frontend), non-leaking centralized error boundaries, and environment-based configuration.
- **DevOps**: Complete Docker orchestration via `docker-compose.yml` with persistent volume storage for SQLite database.

---

## 🛠️ Project Structure

```
.
├── client/                     # Vue 3 + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # NoteList.vue, NoteForm.vue, NoteCard.vue, ConfirmModal.vue
│   │   ├── services/           # api.ts (Axios instance & error handling)
│   │   ├── types/              # note.ts (TypeScript interfaces)
│   │   ├── App.vue             # Root layout & state management
│   │   ├── main.ts
│   │   └── style.css           # Tailwind CSS & dark theme tokens
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── server/                     # Node.js + Express + SQLite Backend
│   ├── src/
│   │   ├── db.ts               # Parameterized SQLite connection & schema initialization
│   │   ├── server.ts           # Express server, security middleware & CRUD API endpoints
│   │   └── types.ts            # Request & response interfaces
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml          # Container orchestration
└── README.md                   # Setup guide & AI process log
```

---

## ⚡ Quick Start & Running Locally

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Backend Setup (`server`)

```bash
cd server
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

The backend server will run at `http://localhost:5000`.

### 2. Frontend Setup (`client`)

Open a separate terminal:

```bash
cd client
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

The frontend application will run at `http://localhost:5173`.

---

## 🐳 Running with Docker (Bonus)

You can launch both the frontend and backend using Docker Compose:

```bash
docker-compose up --build
```

- **Frontend UI**: `http://localhost`
- **Backend REST API**: `http://localhost:5000/api`

---

## 📡 REST API Documentation

| Method   | Endpoint          | Description                                    | Payload / Query                     |
| :------- | :---------------- | :--------------------------------------------- | :---------------------------------- |
| `GET`    | `/api/health`     | Health check endpoint                          | N/A                                 |
| `GET`    | `/api/notes`      | Fetch all notes (sorted by `updated_at DESC`)  | N/A                                 |
| `GET`    | `/api/notes/:id`  | Fetch single note by ID                        | N/A                                 |
| `POST`   | `/api/notes`      | Create a new note                              | `{ "title": "...", "content": "..." }` |
| `PUT`    | `/api/notes/:id`  | Update an existing note                        | `{ "title": "...", "content": "..." }` |
| `DELETE` | `/api/notes/:id`  | Delete a note with confirmation                | N/A                                 |

---

## 🤖 Development Process & AI Log

In accordance with pre-task guidelines, below are 3 concrete examples of how AI assistance was leveraged, verified, and refined during development:

### Example 1: Frontend Note Layout Component
- **Prompt Given**:  
  *"Generate a Vue 3 TypeScript component using Tailwind CSS to display note cards in a responsive grid layout with edit/delete buttons."*
- **AI Output**:  
  The AI produced a standard card layout with rounded borders, soft drop shadows, colorful gradient headers, and inline state toggles.
- **Modification & Verification**:  
  Stripped out all rounded floating shadows and colorful gradients to match our sleek, anti-vibecode technical design (Linear/Vercel slate monochrome styling). Replaced generic button text with accessible Lucide icons (`Edit2`, `Trash2`), added a `line-clamp-4` expand/collapse toggle for long notes, and bound typed Vue emits (`@edit`, `@delete`).
- **Reasoning**:  
  CRUD usability and crisp readability take absolute priority over generic AI aesthetics. High-contrast border definitions provide a much cleaner engineering finish.

### Example 2: Backend Parameterized SQLite Schema & Connection
- **Prompt Given**:  
  *"Provide a Node.js Express TypeScript database connection script using sqlite3 that initializes a notes table."*
- **AI Output**:  
  Suggested using string concatenation inside `.exec()` queries (`"CREATE TABLE " + tableName`) and basic unparameterized queries.
- **Modification & Verification**:  
  Replaced raw string building with `sqlite` promise-based wrapper methods and enforced strict parameterized SQL statements (`db.all('SELECT ... WHERE id = ?', [id])`, `db.run('INSERT INTO notes ... VALUES (?, ?, ?, ?, ?)', [...])`). Added automatic `PRAGMA foreign_keys = ON;` initialization.
- **Reasoning**:  
  Production-grade security hygiene requires zero SQL injection surface area. Parameterized queries protect data integrity regardless of input strings.

### Example 3: Express Error Boundary & Centralized Validation
- **Prompt Given**:  
  *"Write an Express error handler middleware that catches database errors and sends details back to client."*
- **AI Output**:  
  Returned a generic catch-all handler `res.status(500).json({ error: err.message, stack: err.stack })`.
- **Modification & Verification**:  
  Refactored the global error middleware to log internal stack traces privately on the server stdout while returning a generic, safe payload `{ error: 'internal server error' }` to clients. Added explicit Zod validation schemas for incoming `POST`/`PUT` requests.
- **Reasoning**:  
  Leaking raw database or stack trace errors to the client creates security vulnerabilities. Centralized Zod validation ensures invalid/blank notes are caught with actionable 400 Bad Request responses before touching SQLite.

---

## ✉️ Submission Protocol

- **Email Subject**: `Full Stack Pre-Task: Aakash Pai`
- **To**: `hr@sudu.ai`
- **CC**: `donghao.lee@aserious.co`
- **Repository Link**: [GitHub Repository URL]
- **Live Server URL**: [Deployment Live URL]
