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

## Development

```bash
npm install
npm run dev
npm run test
npm run build
```

## V1 Features

- Dashboard with MARCH performance tracking
- Scenario library with Scenario 001 (Dismounted Blast Casualty)
- Natural-language command interface with structured action parsing
- Hidden finding discovery system
- Anatomical location validation
- Time-based deterioration
- Deterministic scoring and After Action Review
- Performance history persistence
- Reference library (placeholder content)
