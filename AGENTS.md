# AIDBAG — Cursor / Codex Agent Guide

AIDBAG is a **terminal casualty trainer**. It is not clinical decision support and is not for real-patient care.

The product runs in Cursor’s terminal (`npm start`). Do not add a Vite/localhost web preview as the primary interface.

## Quick start

```bash
npm install
npm start
npm test
```

## Repository map

| Area | Path | Purpose |
|------|------|---------|
| Desk UI | `src/cli/` | Menu, training loop, AAR printout |
| Simulation engine | `src/engine/` | State transitions, scoring — **authoritative medical truth** |
| Action parser | `src/engine/actionParser.ts` | Natural language → structured `ActionType` |
| Scenario data | `src/scenarios/` | Scenario 001 / 003 definitions |
| Persistence | `src/lib/persistence.ts` | File store `.aidbag/records.json` (or localStorage in tests) |

## Non-negotiable architecture rule

**AI handles interaction. Deterministic code handles medical truth.**

Never move medical outcomes into AI/LLM logic. Injuries, findings, deterioration, intervention success, scoring, and pass/fail come only from scenario data, `executeAction()`, and `generateAAR()`.

## Testing

```bash
npm test
npm run build
```
