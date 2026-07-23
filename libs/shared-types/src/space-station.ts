// The Space Station: a second, independent base from the Outpost — its own
// grid/coordinate space and its own building catalog, sharing only the
// underlying resource economy (ResourceBalance) and the station-mini-game
// mechanic (StationConfig, reused as-is from outpost.ts). Deliberately kept
// as a fully separate system rather than generalizing OutpostBuilding to a
// "location" field, so nothing here can regress the already-verified
// Outpost code.
import type { ResourceType, StationConfig } from './outpost.ts';

export const SPACE_STATION_GRID_SIZE = 8;

export interface SpaceStationRecipe {
  key: string;
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
}

export const SPACE_STATION_RECIPES: SpaceStationRecipe[] = [
  {
    key: 'COMMS_ARRAY',
    name: 'Comms Array',
    description: 'Long-range signal relay.',
    cost: { ICE: 4, ALLOY: 3 },
  },
  {
    key: 'CRYO_BAY',
    name: 'Cryo Bay',
    description: 'Preserves biological samples.',
    cost: { ICE: 5, FUEL: 2 },
  },
  {
    key: 'SHIELD_GENERATOR',
    name: 'Shield Generator',
    description: 'Deflects debris and radiation.',
    cost: { ICE: 3, CRYSTAL: 4 },
  },
  {
    key: 'OBSERVATION_DECK',
    name: 'Observation Deck',
    description: 'Wide-view scope for surveying nearby systems.',
    cost: { ICE: 3, DATACORE: 3 },
  },
  {
    key: 'DOCKING_RING',
    name: 'Docking Ring',
    description: 'Ship berths and refueling.',
    cost: { ICE: 4, ALLOY: 2 },
  },
  {
    key: 'COMMAND_BRIDGE',
    name: 'Command Bridge',
    description: "The station's nerve center — needs a bit of everything.",
    cost: { ICE: 5, CRYSTAL: 2, ALLOY: 2, BIOMASS: 2, DATACORE: 2, FUEL: 2 },
  },
];

export function findSpaceStationRecipe(
  key: string,
): SpaceStationRecipe | undefined {
  return SPACE_STATION_RECIPES.find((recipe) => recipe.key === key);
}

export const SPACE_STATION_CONFIG: Record<string, StationConfig> = {
  COMMS_ARRAY: {
    buildingKey: 'COMMS_ARRAY',
    label: 'Signal Sweep',
    resource: 'DATACORE',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  CRYO_BAY: {
    buildingKey: 'CRYO_BAY',
    label: 'Sample Analysis',
    resource: 'BIOMASS',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  SHIELD_GENERATOR: {
    buildingKey: 'SHIELD_GENERATOR',
    label: 'Shield Calibration',
    resource: 'ALLOY',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  OBSERVATION_DECK: {
    buildingKey: 'OBSERVATION_DECK',
    label: 'Star Survey',
    resource: 'CRYSTAL',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  DOCKING_RING: {
    buildingKey: 'DOCKING_RING',
    label: 'Refuel Run',
    resource: 'FUEL',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  COMMAND_BRIDGE: {
    buildingKey: 'COMMAND_BRIDGE',
    label: 'Bridge Sweep',
    resource: 'ALL',
    baseYield: 2,
    cooldownSeconds: 180,
  },
};

export function spaceStationStationFor(
  buildingKey: string,
): StationConfig | undefined {
  return SPACE_STATION_CONFIG[buildingKey];
}

export interface SpaceStationGridCell {
  x: number;
  y: number;
  buildingKey: string;
  lastCollectedAt: string | null;
  lastAutomationAt: string | null;
}

export interface SpaceStationState {
  // Same shared ResourceBalance rows OutpostState.resources reports —
  // included here too so this component is self-contained (can check craft
  // affordability without a second fetch or cross-component wiring), not
  // because the Space Station has its own separate resource pool.
  resources: Record<ResourceType, number>;
  stock: { buildingKey: string; stock: number; totalCrafted: number }[];
  grid: SpaceStationGridCell[];
  // Same passive-automation surfacing as OutpostState — see
  // AUTOMATION_INTERVAL_MINUTES in outpost.ts, reused as-is here.
  automationCollected: { resource: ResourceType; amount: number }[];
}

export interface SpaceStationCollectResult extends SpaceStationState {
  collected: { resource: ResourceType; amount: number }[];
}
