export type Money = string;
export type AgentId = 'max' | 'lev' | 'chill';
export type Privacy = 'open' | 'results' | 'closed';
export type InstrumentKind = 'shares' | 'bonds' | 'funds' | 'metals';
export interface Agent {
  id: AgentId;
  name: string;
  style: string;
  description: string;
  color: string;
  approach: string;
}
export interface AgentConfig {
  agentId: AgentId;
  goal: string;
  priority?: string;
  horizon: string;
  budget: Money;
  mode: 'confirm' | 'autonomous';
  paused: boolean;
  leverage: boolean;
  maxLeverage: string;
  short: boolean;
  derivatives: boolean;
  maxPositionPercent: string;
  costLimit: Money;
  instruments: InstrumentKind[];
  communication: 'business' | 'friendly' | 'energetic';
  revision: number;
  onboardingComplete: boolean;
  agentSelected?: boolean;
}
export interface User {
  id: string;
  name: string;
  avatar: string;
  title: string;
  privacy: Privacy;
  rank: string;
  place: number;
  returnPercent: string;
  drawdownPercent: string;
  following: boolean;
  movement?: number;
}
export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  kind: InstrumentKind;
  price: Money;
  changePercent: string;
  lotSize: number;
  color: string;
  history: { date: string; value: number }[];
  description: string;
}
export interface Position {
  instrumentId: string;
  symbol: string;
  name: string;
  lots: number;
  quantity: number;
  price: Money;
  value: Money;
}
export interface Portfolio {
  value: Money;
  cash: Money;
  reserved: Money;
  invested: Money;
  profit: Money;
  returnPercent: string;
  drawdownPercent: string;
  positions: Position[];
  history: { date: string; value: number }[];
}
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  createdAt: string;
  agentId?: AgentId;
  choices?: string[];
  plan?: TradePreview;
}
export interface JournalEvent {
  id: string;
  type: 'trade' | 'analysis' | 'settings' | 'squad';
  title: string;
  description: string;
  status: string;
  source: string;
  createdAt: string;
  instrumentId?: string;
}
export interface Activity {
  id: string;
  type: string;
  text: string;
  createdAt: string;
  instrumentId?: string;
}
export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  rank: string;
  place: number;
  returnPercent: string;
  drawdownPercent: string;
  isCurrent: boolean;
  movement?: number;
}
export interface PublicProfile {
  user: User;
  holdings: Position[] | null;
  trades: JournalEvent[] | null;
  awards: Reward[];
  agent: Agent;
  strategy: string;
  history: { date: string; value: number }[];
}
export interface SquadMember {
  id: string;
  userId: string;
  name: string;
  agentId: AgentId;
  contribution: Money;
  units: string;
  sharePercent: string;
  value: Money;
  profit: Money;
}
export interface SquadDecision {
  id: string;
  title: string;
  status: 'proposed' | 'approved' | 'executed' | 'rejected' | 'stale';
  text: string;
  approvals: string[];
  revision: number;
  createdAt: string;
  messages: ChatMessage[];
  proposedStrategy?: SquadStrategyConfig;
  plan?: { actions: SquadOrder[]; reason: string };
  execution?: {
    status: 'not_started' | 'executed_demo';
    orders: SquadOrder[];
    executedAt: string | null;
  };
}
export interface ContributionRequest {
  id: string;
  userId: string;
  amount: Money;
  status: 'pending' | 'approved';
  approvals: string[];
  createdAt: string;
}
export interface SquadStrategyConfig {
  strategy: string;
  goal: string;
  horizon: 'short' | 'medium' | 'long';
  approach: 'cautious' | 'balanced' | 'active';
  mode: 'confirm' | 'autonomous';
  leverage: boolean;
  short: boolean;
  derivatives: boolean;
  maxPositionPercent: string;
  maxLeverage: string;
  costLimit: Money;
}
export interface SquadOrder {
  id: string;
  instrumentId: string;
  side: 'buy' | 'sell';
  lots: number;
  quantity: number;
  price: Money;
  base: Money;
  fee: Money;
  total: Money;
  status: 'planned' | 'executed_demo';
  leverage: boolean;
  derivative: boolean;
}
export interface Squad extends SquadStrategyConfig {
  ranked: boolean;
  id: string;
  name: string;
  code: string;
  captainId: string;
  status: 'active' | 'archived';
  value: Money;
  profit: Money;
  returnPercent: string;
  members: SquadMember[];
  strategy: string;
  goal: string;
  mode: 'confirm' | 'autonomous';
  revision: number;
  messages: ChatMessage[];
  decisions: SquadDecision[];
  contributions: ContributionRequest[];
  cash: Money;
  positions: Record<string, number>;
  ownerConsents: string[];
  virtualOrders: SquadOrder[];
  myExit?: ExitPreview;
  archiveDistribution?: ExitPreview[];
  archivedAt?: string;
}
export interface ExitPreview {
  id: string;
  squadId: string;
  memberId: string;
  value: Money;
  contribution: Money;
  profit: Money;
  fee: Money;
  tax: Money;
  payout: Money;
  revision: number;
  consumed: boolean;
}
export interface DissolvePreview {
  id: string;
  squadId: string;
  revision: number;
  members: ExitPreview[];
  consumed: boolean;
}
export interface Reward {
  id: string;
  level: number;
  name: string;
  kind: 'title' | 'theme' | 'skin' | 'badge' | 'card' | 'animation' | 'accessory' | 'cover';
  kindLabel: string;
  premium: boolean;
  claimed: boolean;
  available: boolean;
}
export interface Season {
  id: string;
  name: string;
  level: number;
  xp: number;
  nextXp: number;
  daysLeft: number;
  rewards: Reward[];
}
export interface Plan {
  id: 'start' | 'plus' | 'squad';
  name: string;
  price: Money;
  unit: string;
  chatLimit: number;
  deepLimit: number;
  features: string[];
  selected: boolean;
}
export interface Comparison {
  id: string;
  task: string;
  budget: Money;
  results: { agent: Agent; reasoning: string; actions: string[] }[];
}
export interface TradeInput {
  instrumentId: string;
  side: 'buy' | 'sell';
  lots: number;
  source?: 'manual' | 'agent';
}
export interface TradePreview extends TradeInput {
  id: string;
  previewId: string;
  quantity: number;
  price: Money;
  base: Money;
  fee: Money;
  total: Money;
  revision: number;
  consumed: boolean;
  expiresAt: string;
  cancelled?: boolean;
}
export interface Overview {
  user: User;
  portfolio: Portfolio;
  config: AgentConfig;
  agent: Agent;
  lastEvent: JournalEvent | null;
  season: Season;
  activePlan: Plan['id'];
  usage: { period: string; ordinary: number };
}
export interface SavedObservation {
  comparison: Comparison;
  paused: boolean;
  createdAt: string;
}
export interface MockDb {
  version: number;
  usage: { period: string; ordinary: number };
  chatPending: boolean;
  users: User[];
  agents: Agent[];
  config: AgentConfig;
  instruments: Instrument[];
  cash: Money;
  netContributions: Money;
  performanceUnits: string;
  positions: Record<string, number>;
  chat: ChatMessage[];
  journal: JournalEvent[];
  activities: Activity[];
  squads: Squad[];
  season: Season;
  planId: Plan['id'];
  tradePreviews: TradePreview[];
  exitPreviews: ExitPreview[];
  dissolvePreviews: DissolvePreview[];
  comparisons: Comparison[];
  observation?: SavedObservation | null;
}

export interface AgentOnboardingDraft {
  agentId: AgentId;
  step: number;
  deferred: boolean;
  goal: string;
  priority: string;
  horizon: string;
  budget: Money;
  mode: 'confirm' | 'autonomous';
  leverage: boolean;
  short: boolean;
  derivatives: boolean;
  maxPositionPercent: string;
  maxLeverage: string;
  costLimit: Money;
  instruments: InstrumentKind[];
  communication: AgentConfig['communication'];
}
export interface AppliedReward {
  reward: Reward;
  theme?: 'light' | 'dark';
  title?: string;
}
