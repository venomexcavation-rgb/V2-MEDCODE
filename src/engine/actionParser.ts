import type { StructuredAction, ActionType } from './types';
import { parseLocationFromText, type AnatomicalLocation } from '@/lib/locations';

export interface ParseResult {
  success: boolean;
  action?: StructuredAction;
  clarification?: string;
}

const ACTION_PATTERNS: { pattern: RegExp; type: ActionType; needsLocation?: boolean }[] = [
  { pattern: /\b(assessing|checking|assess|check)\s+(for\s+)?avpu\b|\bavpu\b/, type: 'assess_avpu' },
  { pattern: /administer\s+450\s*(cc|ml|milliliters?)\s+(of\s+)?low[\s-]*titer\s+o[\s-]*whole\s+blood|450\s*(cc|ml)\s+(of\s+)?low[\s-]*titer\s+o[\s-]*whole\s+blood|low[\s-]*titer\s+o[\s-]*whole\s+blood|ltowb|whole\s+blood/, type: 'administer_whole_blood' },
  { pattern: /assess\s*(for\s*)?massive\s*hemorrhage|check\s*(for\s*)?massive\s*bleeding|major\s*bleeding|life.?threatening\s*bleed/, type: 'assess_massive_hemorrhage' },
  { pattern: /blood\s*sweep|sweep\s*(for\s*)?blood|check\s*(for\s*)?blood/, type: 'blood_sweep' },
  { pattern: /expose|remove\s*clothing|cut\s*away|pull\s*up\s*pant|roll\s*up\s*sleeve|access\s*wound/, type: 'expose', needsLocation: true },
  { pattern: /visual\s*inspection|look\s*at|inspect/, type: 'visual_inspection', needsLocation: true },
  { pattern: /assess\s*airway|check\s*airway|open\s*airway|airway\s*assessment/, type: 'assess_airway' },
  { pattern: /assess\s*breathing|check\s*breathing|assess\s*respiration|check\s*respiration/, type: 'assess_breathing' },
  { pattern: /assess\s*circulation|check\s*circulation|check\s*perfusion/, type: 'assess_circulation' },
  { pattern: /radial\s*pulse|check\s*pulse|feel\s*(for\s*)?pulse/, type: 'check_radial_pulse' },
  { pattern: /check\s*respirations|count\s*respirations|respiratory\s*rate/, type: 'check_respirations' },
  { pattern: /penetrating\s*chest|sucking\s*chest|chest\s*trauma|open\s*chest\s*wound|entry\s*wound/, type: 'check_penetrating_chest_trauma', needsLocation: true },
  { pattern: /tourniquet|tq|high\s*and\s*tight|stop\s*the\s*bleeding/, type: 'apply_tourniquet', needsLocation: true },
  { pattern: /pack\s*(the\s*)?wound|wound\s*pack|hemostatic|gauze\s*pack/, type: 'pack_wound', needsLocation: true },
  { pattern: /chest\s*seal|occlusive\s*dressing|seal\s*(the\s*)?chest/, type: 'apply_chest_seal', needsLocation: true },
  { pattern: /needle\s*decompression|decompress|nct/, type: 'needle_decompression', needsLocation: true },
  { pattern: /reassess\s*bleeding|reassess\s*hemorrhage|check\s*if\s*bleeding\s*stopped|re.?check\s*bleed/, type: 'reassess_hemorrhage' },
  { pattern: /reassess\s*breathing|reassess\s*respiration|check\s*breathing\s*again/, type: 'reassess_breathing' },
  { pattern: /reassess\s*circulation|reassess\s*pulse|check\s*pulse\s*again/, type: 'reassess_circulation' },
  { pattern: /reassess\s*airway/, type: 'reassess_airway' },
  { pattern: /reassess|secondary\s*survey|repeat\s*assessment/, type: 'reassess_general' },
  { pattern: /log\s*roll|roll\s*(the\s*)?casualty/, type: 'log_roll' },
  { pattern: /initiate\s*(an?\s*)?(iv|intravenous)\s*access|start\s*(an?\s*)?iv|iv\s*access/, type: 'initiate_iv_access' },
  { pattern: /initiate\s*(a\s*)?saline\s*lock|saline\s*lock|hep(\-|\s*)lock/, type: 'initiate_saline_lock' },
  { pattern: /\btxa\b|tranexamic/, type: 'administer_txa' },
  { pattern: /prevent\s*hypothermia|apply\s*(a\s*)?(blanket|hypothermia\s*(kit|prevention)|hpmk)|cover\s*(the\s*)?(casualty|patient)|insulate|keep\s*(him|them|the\s*casualty)\s*warm/, type: 'prevent_hypothermia' },
  { pattern: /end\s*(the\s*)?scenario|complete\s*(the\s*)?scenario|stop\s*(the\s*)?simulation|finish\s*(the\s*)?(scenario|training)/, type: 'end_scenario' },
  { pattern: /evac|request\s*medevac|call\s*for\s*help|9.?line|request\s*evacuation/, type: 'request_evacuation' },
];

function inferLocationFromContext(input: string, actionType: ActionType): AnatomicalLocation | undefined {
  const fromText = parseLocationFromText(input);
  if (fromText) return fromText;

  // Contextual inference only for expose when body part mentioned loosely
  if (actionType === 'expose') {
    if (/leg|lower extremity|limb below/i.test(input)) return undefined; // too ambiguous
  }

  return undefined;
}

function hasTwoGramTxaDose(input: string): boolean {
  const normalized = input.toLowerCase();
  return /(?:2|two)\s*(?:g|gm|grams?)\b/.test(normalized) && /txa|tranexamic/.test(normalized);
}

function hasFourFiftyWholeBloodVolume(input: string): boolean {
  const normalized = input.toLowerCase();
  return /450\s*(cc|ml|milliliters?)\b/.test(normalized);
}

function extractParameters(input: string, type: ActionType): Record<string, string | boolean | number> {
  const params: Record<string, string | boolean | number> = {};
  if (type === 'apply_tourniquet') {
    if (/high\s*and\s*tight|high\s*&\s*tight/i.test(input)) {
      params.placement = 'high_and_tight';
    }
  }
  if (type === 'administer_txa' && hasTwoGramTxaDose(input)) {
    params.doseGrams = 2;
  }
  if (type === 'administer_whole_blood' && hasFourFiftyWholeBloodVolume(input)) {
    params.volumeMl = 450;
  }
  return params;
}

export function parseActionInput(rawInput: string): ParseResult {
  const input = rawInput.trim();
  if (!input) {
    return { success: false, clarification: 'Please describe your assessment or intervention.' };
  }

  const normalized = input.toLowerCase();

  for (const { pattern, type, needsLocation } of ACTION_PATTERNS) {
    if (pattern.test(normalized)) {
      const location = inferLocationFromContext(input, type);
      const parameters = extractParameters(input, type);

      if (type === 'administer_txa' && parameters.doseGrams !== 2) {
        return {
          success: false,
          clarification: 'Specify the TXA dose. Use: administer 2 grams TXA.',
        };
      }

      if (type === 'administer_whole_blood' && parameters.volumeMl !== 450) {
        return {
          success: false,
          clarification:
            'Specify the whole blood volume. Use: Administer 450cc of low titer O whole blood or Administer 450mL of low titer O whole blood.',
        };
      }

      if (needsLocation && !location) {
        const locationPrompts: Partial<Record<ActionType, string>> = {
          apply_tourniquet: 'Where are you applying the tourniquet?',
          pack_wound: 'Which wound are you packing? Specify the anatomical location.',
          apply_chest_seal: 'Which side of the chest are you sealing?',
          expose: 'Which body region are you exposing?',
          needle_decompression: 'Which side are you decompressing?',
          check_penetrating_chest_trauma: 'Which side of the chest are you assessing?',
          visual_inspection: 'Which area are you inspecting?',
        };
        return {
          success: false,
          clarification: locationPrompts[type] ?? 'Please specify the anatomical location.',
        };
      }

      return {
        success: true,
        action: {
          type,
          location,
          parameters,
          rawInput: input,
        },
      };
    }
  }

  return {
    success: false,
    clarification:
      'Could not interpret that action. Try commands like "Do a blood sweep", "Expose the left leg", or "Apply a tourniquet high and tight to the left leg."',
  };
}

export function getActionLabel(type: ActionType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
