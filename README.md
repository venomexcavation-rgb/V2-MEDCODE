# 68W Training System

Tactical casualty simulation platform for U.S. Army 68W Combat Medic training.

**Training Use Only** — This system simulates casualty-care scenarios for education and training. It is not intended to provide medical advice or direct treatment of real patients.

## Architecture

- **Scenario Data** — Structured scenario definitions (`src/scenarios/`)
- **Action Parser** — Natural language → structured actions (`src/engine/actionParser.ts`)
- **Simulation Engine** — Deterministic state transitions (`src/engine/simulationEngine.ts`)
- **AAR Engine** — Deterministic scoring from event history (`src/engine/aar.ts`)
- **Persistence** — Local storage for training records (`src/lib/persistence.ts`)

## Core Principle

AI handles interaction. Deterministic code handles medical truth.

## Live demo

- Dashboard: https://venomexcavation-rgb.github.io/V2-MEDCODE/
- Scenario 001: https://venomexcavation-rgb.github.io/V2-MEDCODE/training/SCENARIO-001
- Scenario 003: https://venomexcavation-rgb.github.io/V2-MEDCODE/training/SCENARIO-003

## Run it on your computer (localhost)

Cloud Agent previews of `localhost:5173` can fail with connection reset. For real localhost, run the app on **your** computer in Cursor Desktop:

1. Install **Node.js LTS** from https://nodejs.org (this also installs `npm`).
2. In Cursor: **File → Clone Repository** (or **Open Folder** if you already have it) and use `https://github.com/venomexcavation-rgb/V2-MEDCODE.git`.
3. Open the `V2-MEDCODE` folder (the one with `package.json`). Allow automatic tasks if Cursor asks.
4. Wait until the terminal shows the server is ready, then open **http://localhost:5173**.
5. Click **Scenarios**, then **Gunshot Wound — Urban** (SCENARIO-003).

You can also start it from a terminal:

```bash
git clone https://github.com/venomexcavation-rgb/V2-MEDCODE.git
cd V2-MEDCODE
git checkout main
git pull origin main
npm install
npm start
```

You must be in the folder that contains `package.json` and `src/components/MarchTracker.tsx`. Do not use the `gh-pages` branch.

If you already cloned the repo and saw `Failed to resolve import "@/components/MarchTracker"`:

```bash
cd V2-MEDCODE
git checkout main
git pull origin main
ls src/components/MarchTracker.tsx
npm install
npm start
```

## Development

```bash
npm install
npm start
npm run test
npm run build
```

## ChatGPT / Codex in Cursor

To let **ChatGPT (Codex)** view and edit this project inside Cursor:

1. Install the **OpenAI Codex** extension (`openai.chatgpt`) in Cursor
2. Open this repo and sign in via **Codex: Open Codex Sidebar**
3. Trust the workspace when prompted
4. Follow the full setup guide: [docs/CODEX_SETUP.md](docs/CODEX_SETUP.md)

Codex reads `AGENTS.md` for project context and `src/engine/AGENTS.md` for simulation engine rules.

## V1 Features

- Dashboard with MARCH performance tracking
- Scenario library with Scenario 001 (Dismounted Blast Casualty) and Scenario 003 (Gunshot Wound — Urban)
- Natural-language command interface with structured action parsing
- Hidden finding discovery system
- Anatomical location validation
- Time-based deterioration
- Deterministic scoring and After Action Review
- Performance history persistence
- Reference library (placeholder content)
