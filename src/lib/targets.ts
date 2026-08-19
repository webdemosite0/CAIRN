/**
 * What the builder can produce.
 *
 * Only the static target renders in the preview pane, and that is a fact about
 * this app rather than a limitation of the code it writes. There is no sandbox
 * here: nothing can run `npm install`, start a dev server or execute Python.
 * React 19 also ships no UMD build, so even a JSX preview would need a bundler
 * at runtime.
 *
 * So the other targets produce a real project you download and run, and the
 * preview pane shows the commands instead of pretending to execute them. A
 * fake terminal printing "Server listening on :3000" would be the easiest
 * thing here to build and the most dishonest.
 */

export type TargetId = "static" | "react" | "node" | "python";

export interface Target {
  id: TargetId;
  label: string;
  blurb: string;
  /** Whether the preview pane can actually render the output. */
  previewable: boolean;
  /** The file the preview or the reader should open first. */
  entry: string;
  /** Shown in the run panel, in order. */
  commands: string[];
  /** Where it will be serving, once running. */
  serves?: string;
  /** Appended to the system prompt for every step of this target. */
  prompt: string;
}

export const TARGETS: Record<TargetId, Target> = {
  static: {
    id: "static",
    label: "Static site",
    blurb: "HTML, CSS and JavaScript. Runs anywhere, previews here.",
    previewable: true,
    entry: "index.html",
    commands: ["open index.html"],
    prompt: `STACK — a static site.

Flat files only: index.html, styles.css, script.js, plus extra .html pages when
the plan calls for them. No build step, no bundler, no framework.

index.html links its siblings with plain relative paths:
  <link rel="stylesheet" href="styles.css">
  <script src="script.js" defer></script>

Zero external requests. No CDN, no web fonts, no remote images. System font
stacks, CSS gradients, inline SVG and emoji only.

JavaScript is plain ES2020 in one script, wrapped so it does not leak globals,
and guards every querySelector before use.`,
  },

  react: {
    id: "react",
    label: "React app",
    blurb: "A real Vite + React project. Download and npm run dev.",
    previewable: false,
    entry: "src/App.jsx",
    commands: ["npm install", "npm run dev"],
    serves: "http://localhost:5173",
    prompt: `STACK — React 18 with Vite, plain JavaScript (.jsx, not TypeScript).

Produce a project that runs after exactly \`npm install && npm run dev\`.

Required files:
  package.json      name, type: "module", scripts (dev/build/preview),
                    dependencies react + react-dom ^18, devDependencies
                    vite ^5 and @vitejs/plugin-react ^4. Real versions, no "*".
  vite.config.js    defineConfig with the react plugin
  index.html        at the ROOT (not in public/), with
                    <div id="root"></div> and
                    <script type="module" src="/src/main.jsx"></script>
  src/main.jsx      createRoot(document.getElementById('root')).render(<App />)
  src/App.jsx       the application
  src/index.css     imported from main.jsx

Component rules:
- Function components with hooks. No class components.
- One component per file under src/components/ once there is more than one.
- Every list uses a stable key from the data, never the array index.
- useEffect declares its full dependency array and cleans up what it starts.
- Lift state only as far as it needs to go; do not put everything in App.
- Derive values during render rather than mirroring props into state.

Styling is plain CSS files imported by the component. No Tailwind, no CSS-in-JS,
no UI library — those add install steps the user did not ask for.

No external network calls. Seed any data as a local module under src/data/.`,
  },

  node: {
    id: "node",
    label: "Node API",
    blurb: "An Express server with routes and storage. Runs on your machine.",
    previewable: false,
    entry: "server.js",
    commands: ["npm install", "npm start"],
    serves: "http://localhost:3000",
    prompt: `STACK — Node.js with Express 4, ES modules.

Produce a server that runs after exactly \`npm install && npm start\`.

Required files:
  package.json   type: "module", scripts.start "node server.js",
                 dependencies express ^4. Real versions, never "*".
  server.js      the app: middleware, routes, listen on
                 process.env.PORT || 3000
  routes/*.js    one router per resource once there is more than one
  store.js       persistence
  README.md      what it is, how to run it, and every endpoint with an example
                 curl command

Server rules:
- express.json() before the routes, and a 404 handler plus a 4-argument error
  handler AFTER them. Order matters; getting it wrong silently breaks both.
- Every route wrapped so a thrown error reaches the error handler rather than
  crashing the process. Async handlers need explicit try/catch — Express 4 does
  not catch rejected promises.
- Validate the request body before touching it. Reply 400 with a message
  naming the offending field, never a stack trace.
- Correct status codes: 201 with a Location header on create, 204 on delete,
  404 when the id is unknown.
- Persistence in a JSON file via fs/promises, read once at boot and written
  after each mutation, with try/catch around both. Say in a comment that this
  suits one process and is not safe for concurrent writers.
- No database driver, no auth library, no dotenv — nothing that adds an
  install step or a service that does not exist.`,
  },

  python: {
    id: "python",
    label: "Python API",
    blurb: "A FastAPI service with typed models. Runs on your machine.",
    previewable: false,
    entry: "main.py",
    commands: [
      "python -m venv .venv",
      ".venv\\Scripts\\activate    # macOS/Linux: source .venv/bin/activate",
      "pip install -r requirements.txt",
      "uvicorn main:app --reload",
    ],
    serves: "http://127.0.0.1:8000  (docs at /docs)",
    prompt: `STACK — Python 3.11 with FastAPI and Pydantic v2.

Produce a service that runs after creating a venv, installing
requirements.txt, and \`uvicorn main:app --reload\`.

Required files:
  requirements.txt   fastapi and uvicorn[standard], pinned with >= a real
                     version. Nothing that needs a database or a compiler.
  main.py            the FastAPI app, routers included
  models.py          Pydantic v2 models
  store.py           persistence
  README.md          what it is, how to run it, and each endpoint with a curl
                     example

Python rules:
- Type hints on every function signature and every model field.
- Pydantic v2 syntax: model_config = ConfigDict(...), field_validator, and
  model_dump() — never the v1 spellings (class Config, @validator, .dict()),
  which fail outright on v2.
- Separate request and response models. Never accept the id from the client on
  create.
- Raise HTTPException with a specific status and detail; never return a bare
  dict for an error.
- 201 on create, 204 on delete, 404 when the id is unknown.
- Persistence in a JSON file through pathlib, read at import and written after
  each change, wrapped in try/except with the file missing handled as empty.
  Note in a comment that this is single-process only.
- Standard library plus FastAPI. No SQLAlchemy, no database, no auth library.`,
  },
};

export const TARGET_LIST = Object.values(TARGETS);

export function targetFor(id: unknown): Target {
  return TARGETS[id as TargetId] ?? TARGETS.static;
}
