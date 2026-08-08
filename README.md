# SUDU Simple File Management System

Full Stack Note Management Application built for the SUDU.AI Intern Full-Stack Web Developer Pre-Task.

Developer: Aakash Pai
Tech Stack: Vue 3, TypeScript, Node.js, Express, SQLite, Tailwind CSS, Docker

## System Architecture

The application is structured into two main workspaces:

- Frontend (`/client`): Vue 3 Composition API with TypeScript, Vite, Tailwind CSS, and Lucide icons. Implements state persistence, optimistic UI updates, folder workspace isolation, search/filtering, and responsive grid/list layouts.
- Backend (`/server`): Node.js and Express API written in TypeScript. Interacts with an SQLite database via parameterized queries to prevent SQL injection vulnerabilities.
- Security Hygiene: HTTP security headers via Helmet, explicit CORS configuration, double-layered validation (Zod on backend, reactive schema validation on frontend), and action-isolated PIN/security question verification.

## Project Structure

```text
.
├── client/                     # Vue 3 + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # NoteList.vue, NoteForm.vue, NoteCard.vue, ConfirmModal.vue
│   │   ├── composables/        # useFolderState.ts, useNoteFilter.ts, useAutoSave.ts
│   │   ├── services/           # api.ts (Axios client)
│   │   ├── types/              # note.ts, folder.ts
│   │   ├── App.vue             # Root layout and state management
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── server/                     # Node.js + Express + SQLite Backend
│   ├── src/
│   │   ├── db.ts               # Parameterized SQLite connection and schema migrations
│   │   ├── server.ts           # Express REST API routes and security middleware
│   │   └── types.ts            # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml          # Container orchestration
└── README.md
```

## Setup and Running Locally

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Backend Setup (`/server`)

```bash
cd server
npm install
npm run dev
```

The backend API server will start on `http://localhost:5000`.

### 2. Frontend Setup (`/client`)

Open a separate terminal window:

```bash
cd client
npm install
npm run dev
```

The frontend application will start on `http://localhost:5173`.

### 3. Running via Docker

To run both services using Docker Compose:

```bash
docker-compose up --build
```

- Frontend: `http://localhost`
- Backend API: `http://localhost:5000/api`

## REST API Documentation

### Notes Endpoints

| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/api/notes` | Fetch all notes sorted by update date | None |
| GET | `/api/notes/:id` | Fetch single note by ID | None |
| POST | `/api/notes` | Create a new note | `{ title, content, category, is_pinned, is_archived, tags, folder_id }` |
| PUT | `/api/notes/:id` | Update existing note | `{ title, content, category, is_pinned, is_archived, tags, folder_id, is_locked, pin_hash }` |
| DELETE | `/api/notes/:id` | Delete note permanently | None |

### Folders & Security Endpoints

| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/api/folders` | Fetch all folders with note counts | None |
| POST | `/api/folders` | Create a new folder | `{ name, color }` |
| PUT | `/api/folders/:id` | Update folder properties or lock | `{ name, color, is_locked, pin }` |
| DELETE | `/api/folders/:id` | Delete folder and unassign notes | None |
| POST | `/api/folders/:id/verify-pin` | Verify folder PIN | `{ pin }` |
| POST | `/api/folders/:id/reset-pin` | Reset folder lock via security answer | `{ answer }` |
| GET | `/api/settings/security-question` | Check if security question is set | None |
| POST | `/api/settings/security-question` | Save security question and answer | `{ question, answer }` |

## AI Development Process Log

In accordance with submission requirements, below are 3 concrete examples of how AI assistance was integrated, evaluated, and modified during development:

### 1. Component Architecture and State Management
- Prompt: "Generate a Vue 3 component layout for note cards and folder lists with drag and drop support."
- AI Output: Generated monolithic components with inline state mutators and unstructured event listeners.
- Refactoring and Verification: Extracted state logic into dedicated composables (`useFolderState`, `useNoteFilter`). Replaced inline drag events with typed emit interfaces and handled event payload normalization in `App.vue` to prevent parameter mismatch bugs during folder moves.
- Reasoning: Decoupling state logic from UI templates makes the codebase easier to maintain and prevents silent state desynchronization between components.

### 2. SQLite Schema and Security Verification
- Prompt: "Write an Express route to insert notes into SQLite database using TypeScript."
- AI Output: Proposed unparameterized string formatting inside query strings.
- Refactoring and Verification: Implemented promise-based sqlite wrappers with parameterized query bindings across all endpoints (`db.all('SELECT ... WHERE id = ?', [id])`). Enforced foreign key constraints (`PRAGMA foreign_keys = ON;`) during initial schema initialization.
- Reasoning: Strict parameterization blocks SQL injection vulnerabilities and handles character sanitization at the driver level.

### 3. Transition Keying and DOM Reconciliation
- Prompt: "Fix Vue TransitionGroup lingering element issue when filtering arrays."
- AI Output: Suggested adding arbitrary `setTimeout` delays in component lifecycle hooks.
- Refactoring and Verification: Rejected arbitrary timers. Defined a reactive computed property (`workspaceKey`) in `NoteList.vue` combining `viewMode`, `showArchived`, `props.activeFolderId`, and filter states, binding it directly to `:key` on `<TransitionGroup>`.
- Reasoning: Binding complete layout context to transition keys lets Vue perform deterministic Virtual DOM diffing with clean element transitions, avoiding ghost elements without artificial delays.
