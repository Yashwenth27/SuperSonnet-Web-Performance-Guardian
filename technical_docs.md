# ComplianceAgent AI - Technical Documentation & Data Flow

This document details the underlying database schemas, API schemas, processing pipelines, and prompt structures for the **ComplianceAgent AI** system.

---

## 1. Database Schema Specifications

We use a local SQLite instance for zero-config persistence. The tables are configured using SQLAlchemy:

### `PerformanceMetric` Table
Stores raw performance events from client browsers.
- `id` (INTEGER, PK): Primary key.
- `url` (VARCHAR): Target webpage route.
- `lcp` (FLOAT, Nullable): Largest Contentful Paint duration in milliseconds.
- `cls` (FLOAT, Nullable): Cumulative Layout Shift score.
- `fid` (FLOAT, Nullable): First Input Delay duration in milliseconds.
- `fcp` (FLOAT, Nullable): First Contentful Paint duration in milliseconds.
- `load_time` (FLOAT, Nullable): Document load duration.
- `created_at` (DATETIME): Event timestamp.

### `JavaScriptError` Table
Captures frontend scripting errors.
- `id` (INTEGER, PK): Primary key.
- `url` (VARCHAR): URL where the exception occurred.
- `message` (TEXT): Exception details.
- `stack_trace` (TEXT, Nullable): Extracted stack frame trace.
- `browser_info` (VARCHAR, Nullable): User agent details.
- `resolved` (BOOLEAN): Status toggle.
- `created_at` (DATETIME): Event timestamp.

### `AuditReport` Table
Saves code compliance audit records.
- `id` (INTEGER, PK): Primary key.
- `target_url` (VARCHAR, Nullable): Page URL if checked.
- `repo_path` (VARCHAR, Nullable): Scanned file path.
- `risk_level` (VARCHAR): Compliance classification (`GREEN`, `AMBER`, `RED`).
- `score` (INTEGER): Lighthouse score (0-100).
- `issues` (TEXT): JSON-stringified array of regressions.
- `code_fixes` (TEXT): JSON-stringified array of before/after code patches.
- `created_at` (DATETIME): Audit timestamp.

### `ChatMessage` Table
Maintains conversational co-pilot history.
- `id` (INTEGER, PK): Primary key.
- `sender` (VARCHAR): Sender identifier (`user` or `agent`).
- `content` (TEXT): Conversational message body.
- `created_at` (DATETIME): Timestamp.

---

## 2. Telemetry Ingestion Data Flow

The flow of client metrics and errors runs asynchronously to prevent rendering lag:

```
[ Client Page / SDK / Extension ]
               │
               ▼  (POST /api/metrics or /api/errors via fetch/sendBeacon)
     [ FastAPI Ingestion ]
               │
               ├─────────────────────────┐
               ▼                         ▼
   [ Write to SQLAlchemy ]     [ Broadcast to Dashboard ]
               │                         │
               ▼                         ▼
        [ SQLite DB ]            [ Live Charts Render ]
```

1. **Extraction**: The SDK listens to browser native APIs (`PerformanceObserver` for `largest-contentful-paint`, `layout-shift`, `first-input`, and `paint`).
2. **Ingestion**: Raw telemetry payload is batched and posted.
3. **Persist & Live Updates**: The backend writes the entry to the SQLite database. The frontend polls this list every few seconds to refresh live gauges and timeseries charts.

---

## 3. API Route References

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/metrics` | Ingests a new performance event from the SDK |
| **GET** | `/api/metrics` | Retrieves a chronological list of recorded metrics |
| **GET** | `/api/metrics/by-url` | Filters recorded metrics by webpage URL |
| **POST** | `/api/errors` | Ingests a new uncaught script exception |
| **GET** | `/api/errors` | Lists uncaught exceptions (allows filtering resolved) |
| **PUT** | `/api/errors/{id}/resolve` | Marks a specific error trace as resolved |
| **POST** | `/api/audits/snippet` | Submits code to AI agent for audit and optimization diffs |
| **POST** | `/api/audits/repo` | Triggers workspace-wide directory simulated audit |
| **GET** | `/api/audits` | Lists past completed compliance reports |
| **GET** | `/api/audits/{id}` | Retrieves a completed report's full JSON issues/fixes |
| **POST** | `/api/agent/chat` | Posts user questions to LangChain performance agent |
| **GET** | `/api/agent/chat/history` | Fetches conversational co-pilot history |

---

## 4. AI Agent Analysis & Heuristics

The LangChain agent utilizes precise prompt instructions and a fallback analyzer compiler to enforce compliance. 

### Performance Analysis Heuristics
If the user code snippet matches target anti-patterns, the analyzer decreases the overall score and schedules correction diffs:
1. **Missing Image Sizes (`CLS` Shift)**: Analyzes `<img>` tags. Lack of explicit size attributes decreases the score by **15 points** and triggers a layout stabilization patch.
2. **Synchronous Scripting (`FCP/LCP` Delay)**: Synchronous `<script src="...">` tags block the browser parser. Decreases the score by **15 points** and suggests adding the `defer` flag.
3. **Wildcard Bundle Imports (`FID/INP` Delay)**: Scanning for package imports like `import * as lodash`. Wildcard imports prevent bundler tree-shaking, increasing script payload size. Decreases the score by **10 points** and suggests named destructuring.
4. **Listener Leakage (`Interaction Lag`)**: Scans for `useEffect` handlers without cleanup return methods. Attaching active events without removals causes event stacking and blocks threading. Decreases the score by **10 points** and injects removal call cleanups.
