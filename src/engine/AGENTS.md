# Simulation Engine — Agent Rules

This directory contains the **authoritative simulation engine**. Edits here directly affect medical truth in the trainer.

## Files

- `types.ts` — `SimulationState`, `ScenarioDefinition`, `ActionType`, scoring types
- `simulationEngine.ts` — `executeAction()`, `tickSimulation()`, discovery, deterioration
- `actionParser.ts` — `parseActionInput()` — regex/pattern parser, not medical authority
- `aar.ts` — `generateAAR()` — deterministic scoring from `state.events`
- `simulationEngine.test.ts` — required tests for engine changes

## Rules

1. `executeAction()` receives **structured** actions only — never raw NL outcomes.
2. Findings appear only when `discoveryConditions` in scenario data are satisfied.
3. Wrong anatomical side must fail safely — use `locationsMatch()` from `@/lib/locations`.
4. Terminated scenarios (`status !== 'active'`) must not continue deteriorating.
5. Pure state transitions preferred; avoid hidden mutable singletons outside `SimulationState`.

## Adding an action handler

1. Add `ActionType` in `types.ts`
2. Add parse pattern in `actionParser.ts` with location clarification when needed
3. Add time cost in scenario `actionTimeCosts`
4. Implement handler in `simulationEngine.ts` switch
5. Add test in `simulationEngine.test.ts`
