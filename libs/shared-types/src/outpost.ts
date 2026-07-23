// "Outpost" — mining, crafting, building, and quests, layered on top of the
// same real-progress data Star Chart already uses. Nothing here is a
// separate grind: resources are paid out by ProgressService.completeLesson
// in the same transaction as EXP/Stardust, so there's no way to "mine"
// without actually completing real lessons.

export type ResourceType =
  | 'CRYSTAL'
  | 'ALLOY'
  | 'BIOMASS'
  | 'DATACORE'
  | 'FUEL'
  | 'ICE';

// Every resource type that exists in the economy (balance display, etc).
export const RESOURCE_TYPES: ResourceType[] = [
  'CRYSTAL',
  'ALLOY',
  'BIOMASS',
  'DATACORE',
  'FUEL',
  'ICE',
];

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  CRYSTAL: 'Crystal',
  ALLOY: 'Alloy',
  BIOMASS: 'Biomass',
  DATACORE: 'Datacore',
  FUEL: 'Fuel',
  ICE: 'Ice',
};

// The subset a lesson's subject can hash to — deliberately excludes ICE,
// which only ever comes from the Asteroid Belt (see ASTEROID_REWARD_ICE),
// never from lessons. A fixed list independent of RESOURCE_TYPES, so adding
// a future resource type there can never silently reshuffle which resource
// an existing subject mines.
const LESSON_MINEABLE_RESOURCES: ResourceType[] = [
  'CRYSTAL',
  'ALLOY',
  'BIOMASS',
  'DATACORE',
  'FUEL',
];

// Deterministic subject -> resource mapping (a stable hash, not a lookup
// table someone has to maintain) — the same subject always mines the same
// resource, and every subject maps to something.
export function resourceForSubject(subject: string): ResourceType {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return LESSON_MINEABLE_RESOURCES[hash % LESSON_MINEABLE_RESOURCES.length];
}

export const RESOURCE_PER_LESSON = 3;
export const REPLAY_RESOURCE_PER_LESSON = 1;

// A small head-start so a brand-new account isn't staring at an empty
// Outpost with nothing craftable — seeded once (OutpostService.ensureStarterKit
// triggers on "this account has zero resource-balance rows of any kind",
// so it can never re-trigger after the player has actually earned/spent
// anything).
export const STARTER_RESOURCE_AMOUNT = 6;

// The Asteroid Belt: a mining spot that needs no crafted building and no
// lesson — available from the moment you sign up. "Mining" is answering one
// Nova-generated question correctly (see AiService.generateQuestions),
// which is also what keeps it from being an instant-click grind.
export const ASTEROID_REWARD_ICE = 4;

export interface AsteroidQuestion {
  attemptId: string;
  question: string;
}

export interface AsteroidAnswerResult {
  correct: boolean;
  correctAnswer?: string;
  awarded?: number;
}

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

// Passive automation: every placed building trickles its resource in on its
// own, no clicking required — separate from (and stacking with) the active
// station mini-game below, which uses its own lastCollectedAt clock. Shared
// here (not duplicated per-service) so the frontend can compute an accurate
// "next tick in Ns" countdown from the same numbers the backend actually
// used to calculate the payout.
export const AUTOMATION_INTERVAL_MINUTES = 10;
export const AUTOMATION_MAX_TICKS = 36; // 6 hours' worth per building, per check
export const AUTOMATION_YIELD_PER_TICK = 1;

export interface OutpostGridCell {
  x: number;
  y: number;
  buildingKey: string;
  lastCollectedAt: string | null;
  lastAutomationAt: string | null;
}

export interface OutpostState {
  resources: Record<ResourceType, number>;
  stardust: number;
  stock: { buildingKey: string; stock: number; totalCrafted: number }[];
  grid: OutpostGridCell[];
  quests: QuestProgress[];
  // Whatever passive automation credited on this fetch (usually empty — a
  // player who checks in more often than the tick interval sees nothing new
  // each time). Surfaced so the UI can show a "⚙ automation: +N X" toast
  // instead of resources just silently changing between visits.
  automationCollected: { resource: ResourceType; amount: number }[];
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
