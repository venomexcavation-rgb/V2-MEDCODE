# 68W Training Platform — Codex / ChatGPT Agent Guide

This repository is a **training simulator** for U.S. Army 68W Combat Medic tactical casualty care. It is **not** clinical decision support and is **not** for real-patient care.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # deterministic engine tests
npm run build
```

## Repository map

| Area | Path | Purpose |
|------|------|---------|
| UI pages | `src/pages/` | Dashboard, Scenarios, Training simulator, AAR, Performance, Reference |
| UI components | `src/components/` | Layout, CasualtyPanel, MarchTracker |
| Simulation engine | `src/engine/` | State transitions, action execution, scoring — **authoritative medical truth** |
| Action parser | `src/engine/actionParser.ts` | Natural language → structured `ActionType` |
| AAR / scoring | `src/engine/aar.ts` | Deterministic evaluation from event history |
| Scenario data | `src/scenarios/scenario001.ts` | Scenario 001 definition, injuries, findings, score rules |
| Locations | `src/lib/locations.ts` | `locationsMatch()`, anatomical hierarchy |
| Persistence | `src/lib/persistence.ts` | LocalStorage training records |
| Styles | `src/styles/global.css` | Tactical/clinical design system |

## Non-negotiable architecture rule

**AI handles interaction. Deterministic code handles medical truth.**

When editing this project, never move medical outcomes into AI/LLM logic. The language model must **not** decide:

- what injury exists, what finding is present, deterioration, intervention success, scoring, or pass/fail

Those outcomes must come only from:

- `ScenarioDefinition` data in `src/scenarios/`
- `executeAction()` in `src/engine/simulationEngine.ts`
- `generateAAR()` in `src/engine/aar.ts`

AI may later assist with phrasing or NL parsing, but parsed actions must still flow through the deterministic engine.

## 68W simulator — where to edit

### Scenario content (safe, data-driven)
- `src/scenarios/scenario001.ts` — injuries, hidden findings, deterioration rules, score rules, completion criteria

### Simulation behavior
- `src/engine/simulationEngine.ts` — action handlers, discovery, deterioration ticks, MARCH status
- `src/engine/actionParser.ts` — command patterns and location extraction
- `src/lib/locations.ts` — anatomical matching

### Trainee-facing UI (must not leak hidden state)
- `src/components/CasualtyPanel.tsx` — only show discovered findings and assessed vitals
- `src/pages/Training.tsx` — simulator workspace, command input, action log

### Scoring / AAR
- `src/engine/aar.ts` — category weights, timeline, feedback generation

## UI design constraints

- Restrained military/clinical aesthetic — near-black charcoal, olive-drab accents
- No health bars, HP, arcade HUD, or gamification
- Red used sparingly for critical states only
- Unknown medical data displays as **NOT ASSESSED** until discovered

## Testing expectations

Before finishing engine or scenario changes, run:

```bash
npm run test
npm run build
```

High-value tests live in `src/engine/simulationEngine.test.ts`:

- `locationsMatch()` parent/child and wrong-side rejection
- hidden finding discovery
- wrong-side tourniquet failure
- correct tourniquet control
- deterioration without treatment
- AAR generation from events

Add tests for new deterministic behavior; do not add trivial coverage.

## Common tasks

| Task | Primary files |
|------|----------------|
| New assessment command | `actionParser.ts`, `simulationEngine.ts`, tests |
| New injury/finding | `scenario001.ts`, discovery conditions in engine |
| New score check | `scenario001.ts` scoreRules, `aar.ts` if needed |
| UI polish | `src/styles/global.css`, relevant page/component |
| New scenario | Add `scenario00X.ts`, register in `SCENARIOS` array |

## Branch / PR conventions

- Feature branches: `cursor/<descriptive-name>-e953`
- Keep diffs focused; match existing TypeScript and naming patterns
- Do not regenerate working systems without inspecting them first

## Code review rules

- Verify hidden simulation state is never exposed in trainee UI
- Verify interventions validate anatomical location via `locationsMatch()`
- Verify scoring comes from event history, not invented at display time
- Preserve separation: scenario data / parser / engine / presentation / evaluation
