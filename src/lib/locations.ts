// Anatomical location hierarchy and matching

export type AnatomicalLocation =
  | 'head'
  | 'neck'
  | 'left_chest'
  | 'right_chest'
  | 'chest'
  | 'abdomen'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'left_thigh'
  | 'left_lower_leg'
  | 'right_leg'
  | 'right_thigh'
  | 'right_lower_leg'
  | 'left_hand'
  | 'right_hand'
  | 'left_foot'
  | 'right_foot'
  | 'whole_body'
  | 'unknown';

export const LOCATION_HIERARCHY: Record<AnatomicalLocation, AnatomicalLocation[]> = {
  head: [],
  neck: [],
  left_chest: ['chest'],
  right_chest: ['chest'],
  chest: [],
  abdomen: [],
  left_arm: [],
  right_arm: [],
  left_leg: [],
  left_thigh: ['left_leg'],
  left_lower_leg: ['left_leg', 'left_thigh'],
  right_leg: [],
  right_thigh: ['right_leg'],
  right_lower_leg: ['right_leg', 'right_thigh'],
  left_hand: ['left_arm'],
  right_hand: ['right_arm'],
  left_foot: ['left_leg', 'left_lower_leg'],
  right_foot: ['right_leg', 'right_lower_leg'],
  whole_body: [],
  unknown: [],
};

export function getParentLocations(location: AnatomicalLocation): AnatomicalLocation[] {
  return LOCATION_HIERARCHY[location] ?? [];
}

export function locationsMatch(
  actionLocation: AnatomicalLocation | undefined,
  targetLocation: AnatomicalLocation,
): boolean {
  if (!actionLocation || actionLocation === 'unknown') return false;
  if (actionLocation === targetLocation) return true;

  const parents = getParentLocations(targetLocation);
  if (parents.includes(actionLocation)) return true;

  const actionParents = getParentLocations(actionLocation);
  if (actionParents.includes(targetLocation)) return true;

  // Same-side extremity matching for leg segments
  if (
    actionLocation === 'left_leg' &&
    (targetLocation === 'left_thigh' || targetLocation === 'left_lower_leg')
  ) {
    return true;
  }
  if (
    actionLocation === 'right_leg' &&
    (targetLocation === 'right_thigh' || targetLocation === 'right_lower_leg')
  ) {
    return true;
  }

  // Chest general matches either side when action is chest
  if (actionLocation === 'chest' && (targetLocation === 'left_chest' || targetLocation === 'right_chest')) {
    return true;
  }

  return false;
}

export function parseLocationFromText(text: string): AnatomicalLocation | undefined {
  const normalized = text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const patterns: [RegExp, AnatomicalLocation][] = [
    [/left\s+lower\s*leg|left\s*shin|left\s*calf|left\s*ankle/, 'left_lower_leg'],
    [/left\s*thigh|left\s*femur/, 'left_thigh'],
    [/left\s*leg|left\s*extremity/, 'left_leg'],
    [/right\s+lower\s*leg|right\s*shin|right\s*calf|right\s*ankle/, 'right_lower_leg'],
    [/right\s*thigh|right\s*femur/, 'right_thigh'],
    [/right\s*leg|right\s*extremity/, 'right_leg'],
    [/left\s*chest|left\s*side\s*of\s*chest|left\s*hemithorax/, 'left_chest'],
    [/right\s*chest|right\s*side\s*of\s*chest|right\s*hemithorax/, 'right_chest'],
    [/chest|thorax|torso/, 'chest'],
    [/abdomen|belly|stomach/, 'abdomen'],
    [/head|skull|face/, 'head'],
    [/neck|throat/, 'neck'],
    [/left\s*arm|left\s*upper\s*extremity/, 'left_arm'],
    [/right\s*arm|right\s*upper\s*extremity/, 'right_arm'],
    [/whole\s*body|entire\s*body|full\s*body/, 'whole_body'],
  ];

  for (const [pattern, location] of patterns) {
    if (pattern.test(normalized)) return location;
  }

  return undefined;
}

export function formatLocation(location: AnatomicalLocation): string {
  return location.replace(/_/g, ' ').toUpperCase();
}
