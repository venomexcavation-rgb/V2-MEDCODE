export interface ReferenceEntry {
  id: string;
  topic: string;
  category: string;
  title: string;
  content: string;
  source: string;
  version: string;
  updated: string;
  placeholder: boolean;
}

export const REFERENCE_LIBRARY: ReferenceEntry[] = [
  {
    id: 'ref-march',
    topic: 'MARCH',
    category: 'MARCH',
    title: 'MARCH Assessment Sequence',
    content:
      'MARCH is a tactical trauma assessment prioritization framework: Massive Hemorrhage, Airway, Respiration, Circulation, Hypothermia/Head injury. In the tactical environment, life-threatening hemorrhage takes priority over all other interventions until controlled.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-tourniquet',
    topic: 'Hemorrhage',
    category: 'Hemorrhage',
    title: 'Tourniquet Application',
    content:
      'For life-threatening extremity hemorrhage that cannot be controlled by direct pressure, apply a tourniquet high and tight on the injured extremity, proximal to the wound. Note time of application. Reassess bleeding after placement.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-chest-seal',
    topic: 'Respiration',
    category: 'Respiration',
    title: 'Open Chest Wound Management',
    content:
      'Identify open chest wounds during breathing assessment. Apply an occlusive dressing sealed on three sides (or commercial chest seal) to prevent air entry through the wound during inspiration.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-airway',
    topic: 'Airway',
    category: 'Airway',
    title: 'Tactical Airway Assessment',
    content:
      'After controlling massive hemorrhage, assess airway patency. Look for obstruction, listen for abnormal sounds, and note the casualty\'s ability to speak. Position the casualty appropriately if needed.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-circulation',
    topic: 'Circulation',
    category: 'Circulation',
    title: 'Shock Recognition',
    content:
      'Assess perfusion through radial pulse quality, skin color and temperature, and mental status changes. Compensated shock may present with tachycardia and anxiety before pulse quality deteriorates.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-hypothermia',
    topic: 'Hypothermia',
    category: 'Hypothermia',
    title: 'Hypothermia Prevention',
    content:
      'Prevent hypothermia during trauma care. Minimize exposure time, cover the casualty after assessment, and insulate from the ground. Hypothermia worsens coagulopathy and shock.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-head-injury',
    topic: 'Head Injury',
    category: 'Head Injury',
    title: 'Head Injury Assessment',
    content:
      'Assess level of consciousness, pupil response, and neurological changes. Declining mental status may indicate traumatic brain injury or worsening shock.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-evacuation',
    topic: 'Evacuation',
    category: 'Evacuation',
    title: 'Tactical Evacuation Principles',
    content:
      'Once immediate life threats are addressed, prepare the casualty for evacuation. Request MEDEVAC, provide ongoing monitoring, and hand off with accurate intervention timeline.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
  {
    id: 'ref-tccc',
    topic: 'TCCC',
    category: 'TCCC',
    title: 'Tactical Combat Casualty Care Overview',
    content:
      'TCCC organizes care into phases: Care Under Fire, Tactical Field Care, and Tactical Evacuation Care. This simulator focuses on Tactical Field Care decision-making and MARCH prioritization.',
    source: '[PLACEHOLDER — Pending validated TCCC source]',
    version: 'Draft',
    updated: '2026-01-01',
    placeholder: true,
  },
];

export const REFERENCE_CATEGORIES = [
  'TCCC',
  'MARCH',
  'Hemorrhage',
  'Airway',
  'Respiration',
  'Circulation',
  'Hypothermia',
  'Head Injury',
  'Evacuation',
];
