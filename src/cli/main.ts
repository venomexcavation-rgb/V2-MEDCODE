import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseActionInput } from '@/engine/actionParser';
import { executeAction, resetEventCounter, tickSimulation } from '@/engine/simulationEngine';
import type { ScenarioDefinition, SimulationState } from '@/engine/types';
import { saveTrainingRecord } from '@/lib/persistence';
import { createInitialState, SCENARIOS } from '@/scenarios/scenario001';
import { aarBlock, banner, casualtyBlock, menuScreen, performanceBlock, trainingHelp } from './render';

const rl = readline.createInterface({ input, output });
input.on('end', () => {
  rl.close();
});

function write(text: string): void {
  output.write(text.endsWith('\n') ? text : `${text}\n`);
}

async function ask(prompt: string): Promise<string> {
  const answer = await rl.question(prompt);
  return answer.trim();
}

async function pause(label = 'Press Return to continue.'): Promise<void> {
  await ask(label + ' ');
}

async function runScenario(scenario: ScenarioDefinition): Promise<void> {
  resetEventCounter();
  let state: SimulationState = createInitialState(scenario);
  let leftForMenu = false;

  write('');
  write(scenario.initialPresentation);
  write('Casualty (groaning): "Help… help me…"');
  write(trainingHelp());
  write(casualtyBlock(state, scenario));

  const clock = setInterval(() => {
    if (state.status !== 'active') return;
    state = tickSimulation(state, scenario, 1);
  }, 1000);

  try {
    while (state.status === 'active') {
      const raw = await ask('AIDBAG > ');
      if (!raw) continue;

      const command = raw.toLowerCase();
      if (command === 'help' || command === '?') {
        write(trainingHelp());
        continue;
      }
      if (command === 'status') {
        write(casualtyBlock(state, scenario));
        continue;
      }
      if (command === 'menu' || command === 'quit' || command === 'exit') {
        leftForMenu = true;
        break;
      }

      const parsed = parseActionInput(raw);
      if (!parsed.success || !parsed.action) {
        write(parsed.clarification ?? 'Could not interpret that. Type help.');
        continue;
      }

      const result = executeAction(state, parsed.action, scenario);
      state = result.state;

      for (const message of result.messages) {
        write(`  ${message}`);
      }

      const lastDialogue = state.dialogueHistory[state.dialogueHistory.length - 1];
      if (lastDialogue) {
        write(`  ${lastDialogue}`);
      }

      write(casualtyBlock(state, scenario));
    }
  } finally {
    clearInterval(clock);
  }

  if (leftForMenu) {
    write('Returned to menu. This run was not saved as a completed session.');
    return;
  }

  if ((state.status === 'completed' || state.status === 'failed') && state.aar) {
    saveTrainingRecord(scenario.id, scenario.title, state.aar, state.elapsedSeconds);
    write(aarBlock(state.aar, scenario.title));
  }

  await pause();
}

async function main(): Promise<void> {
  write(banner());

  for (;;) {
    write(menuScreen());
    const choice = (await ask('Select > ')).toLowerCase();

    if (choice === 'q' || choice === 'quit' || choice === 'exit') {
      write('Desk closed.');
      break;
    }
    if (choice === 'p' || choice === 'performance') {
      write(performanceBlock());
      await pause();
      continue;
    }

    const index = Number.parseInt(choice, 10) - 1;
    const scenario = SCENARIOS[index];
    if (!scenario) {
      write('Type 1, 2, P, or Q.');
      continue;
    }
    await runScenario(scenario);
  }

  rl.close();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  write(`AIDBAG failed: ${message}`);
  rl.close();
  process.exitCode = 1;
});
