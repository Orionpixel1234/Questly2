// "Outpost" — mining, crafting, building, and quests, layered on top of the
// same real-progress data Star Chart already uses. Nothing here is a
// separate grind: resources are paid out by ProgressService.completeLesson
// in the same transaction as EXP/Stardust, so there's no way to "mine"
// without actually completing real lessons.

export type ResourceType = 'CRYSTAL' | 'ALLOY' | 'BIOMASS' | 'DATACORE' | 'FUEL';

export const RESOURCE_TYPES: ResourceType[] = [
  'CRYSTAL',
  'ALLOY',
  'BIOMASS',
  'DATACORE',
  'FUEL',
];

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  CRYSTAL: 'Crystal',
  ALLOY: 'Alloy',
  BIOMASS: 'Biomass',
  DATACORE: 'Datacore',
  FUEL: 'Fuel',
};

// Deterministic subject -> resource mapping (a stable hash, not a lookup
// table someone has to maintain) — the same subject always mines the same
// resource, and every subject maps to something.
export function resourceForSubject(subject: string): ResourceType {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return RESOURCE_TYPES[hash % RESOURCE_TYPES.length];
}

export const RESOURCE_PER_LESSON = 3;

export interface OutpostRecipe {
  key: string;
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
}

export const OUTPOST_RECIPES: OutpostRecipe[] = [
  {
    key: 'SOLAR_ARRAY',
    name: 'Solar Array',
    description: 'Basic power generation.',
    cost: { CRYSTAL: 5, FUEL: 2 },
  },
  {
    key: 'ALLOY_FOUNDRY',
    name: 'Alloy Foundry',
    description: 'Smelts raw ore into alloy.',
    cost: { ALLOY: 4, CRYSTAL: 3 },
  },
  {
    key: 'BIO_DOME',
    name: 'Bio Dome',
    description: 'Life support and growth.',
    cost: { BIOMASS: 6, DATACORE: 2 },
  },
  {
    key: 'DATA_RELAY',
    name: 'Data Relay',
    description: 'Long-range comms.',
    cost: { DATACORE: 5, FUEL: 3 },
  },
  {
    key: 'FUEL_DEPOT',
    name: 'Fuel Depot',
    description: 'Stores refined fuel.',
    cost: { FUEL: 6, ALLOY: 2 },
  },
  {
    key: 'COMMAND_CENTER',
    name: 'Command Center',
    description: "The heart of your outpost — needs a bit of everything.",
    cost: { CRYSTAL: 3, ALLOY: 3, BIOMASS: 3, DATACORE: 3, FUEL: 3 },
  },
];

export function findRecipe(key: string): OutpostRecipe | undefined {
  return OUTPOST_RECIPES.find((recipe) => recipe.key === key);
}

export const OUTPOST_GRID_SIZE = 8;

export type QuestObjective =
  | { type: 'completeLessons'; count: number }
  | { type: 'resourceBalance'; resource: ResourceType; count: number }
  | { type: 'craftTotal'; buildingKey: string; count: number }
  | { type: 'placeTotal'; buildingKey?: string; count: number };

export interface QuestReward {
  stardust?: number;
  resource?: ResourceType;
  resourceAmount?: number;
}

export interface OutpostQuest {
  key: string;
  title: string;
  description: string;
  objective: QuestObjective;
  reward: QuestReward;
}

export const QUEST_CATALOG: OutpostQuest[] = [
  {
    key: 'FIRST_CONTACT',
    title: 'First Contact',
    description: 'Complete your first lesson.',
    objective: { type: 'completeLessons', count: 1 },
    reward: { stardust: 20 },
  },
  {
    key: 'STOCKPILE',
    title: 'Stockpile',
    description: 'Bank 15 Crystal.',
    objective: { type: 'resourceBalance', resource: 'CRYSTAL', count: 15 },
    reward: { resource: 'ALLOY', resourceAmount: 10 },
  },
  {
    key: 'FOUNDRY_ONLINE',
    title: 'Foundry Online',
    description: 'Craft an Alloy Foundry.',
    objective: { type: 'craftTotal', buildingKey: 'ALLOY_FOUNDRY', count: 1 },
    reward: { stardust: 30 },
  },
  {
    key: 'GROUNDBREAKING',
    title: 'Groundbreaking',
    description: 'Place your first building.',
    objective: { type: 'placeTotal', count: 1 },
    reward: { resource: 'FUEL', resourceAmount: 10 },
  },
  {
    key: 'OUTPOST_COMMANDER',
    title: 'Outpost Commander',
    description: 'Build a Command Center.',
    objective: { type: 'placeTotal', buildingKey: 'COMMAND_CENTER', count: 1 },
    reward: { stardust: 100 },
  },
];

export interface QuestProgress {
  quest: OutpostQuest;
  current: number;
  target: number;
  complete: boolean;
  claimed: boolean;
}

export interface OutpostGridCell {
  x: number;
  y: number;
  buildingKey: string;
  lastCollectedAt: string | null;
}

export interface OutpostState {
  resources: Record<ResourceType, number>;
  stardust: number;
  stock: { buildingKey: string; stock: number; totalCrafted: number }[];
  grid: OutpostGridCell[];
  quests: QuestProgress[];
}

// A placed building doubles as a "station": a short reflex mini-game you can
// replay on a cooldown for a resource payout, scaled by how well you play.
// This sits alongside (not instead of) lesson-driven mining — it's what
// gives the outpost something to actively do between lessons.
export interface StationConfig {
  buildingKey: string;
  label: string;
  resource: ResourceType | 'ALL';
  baseYield: number;
  cooldownSeconds: number;
}

export const STATION_CONFIG: Record<string, StationConfig> = {
  SOLAR_ARRAY: {
    buildingKey: 'SOLAR_ARRAY',
    label: 'Solar Charging',
    resource: 'FUEL',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  ALLOY_FOUNDRY: {
    buildingKey: 'ALLOY_FOUNDRY',
    label: 'Smelting Run',
    resource: 'ALLOY',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  BIO_DOME: {
    buildingKey: 'BIO_DOME',
    label: 'Hydroponics Tending',
    resource: 'BIOMASS',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  DATA_RELAY: {
    buildingKey: 'DATA_RELAY',
    label: 'Signal Decoding',
    resource: 'DATACORE',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  FUEL_DEPOT: {
    buildingKey: 'FUEL_DEPOT',
    label: 'Cryo-Crystal Harvest',
    resource: 'CRYSTAL',
    baseYield: 5,
    cooldownSeconds: 90,
  },
  COMMAND_CENTER: {
    buildingKey: 'COMMAND_CENTER',
    label: 'Command Sweep',
    resource: 'ALL',
    baseYield: 2,
    cooldownSeconds: 180,
  },
};

export function stationFor(buildingKey: string): StationConfig | undefined {
  return STATION_CONFIG[buildingKey];
}

export interface StationCollectResult extends OutpostState {
  collected: { resource: ResourceType; amount: number }[];
}
