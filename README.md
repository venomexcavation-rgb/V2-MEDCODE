# AIDBAG

Field casualty training desk that runs **inside Cursor’s terminal**. No browser. No localhost. No extra windows.

**Training use only.** This simulates casualty care for education. It is not medical advice and is not for real patients.

## How to use it (this Cursor window)

1. Open the Terminal panel in Cursor (same window as this project).
2. Type `npm start` and press Return. If dependencies are missing, run `npm install` once first.
3. Type `1` or `2` to pick a scenario.
4. Type what a medic would do, like `Check for massive hemorrhage`.
5. Type `help` if you get stuck. Type `q` at the menu to quit.

Stay in this window. The desk prints the casualty, MARCH status, and After Action Review here.

## Architecture

AI (or you) types actions. Deterministic code owns medical truth.

| Area | Path |
|------|------|
| Desk (this app) | `src/cli/` |
| Simulation engine | `src/engine/` |
| Action parser | `src/engine/actionParser.ts` |
| AAR / scoring | `src/engine/aar.ts` |
| Scenarios | `src/scenarios/` |

## Commands

```bash
npm install
npm start
npm test
```

## Scenarios

- SCENARIO-001 Dismounted Blast Casualty
- SCENARIO-003 Gunshot Wound — Urban
- SCENARIO-002 Vehicle Roll-Over (coming soon)
