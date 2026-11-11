import type {
  Agent,
  AgentConfig,
  AppliedReward,
  SquadStrategyConfig,
  Activity,
  ChatMessage,
  Comparison,
  SavedObservation,
  ContributionRequest,
  DissolvePreview,
  ExitPreview,
  Instrument,
  JournalEvent,
  LeaderboardEntry,
  Overview,
  Plan,
  Portfolio,
  PublicProfile,
  Reward,
  Season,
  Squad,
  SquadDecision,
  TradeInput,
  TradePreview,
  User,
} from './contracts';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const forced =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('mockError');
  const url = `/api/${path}${forced ? (path.includes('?') ? '&' : '?') + 'mockError=1' : ''}`;
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new ApiError(
      res.status,
      data.code || 'ERROR',
      data.message || 'Не удалось выполнить запрос',
    );
  return data as T;
}
const get = <T>(resource: string, params: Record<string, string | undefined> = {}) =>
  request<T>(
    resource +
      '?' +
      new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<
          string,
          string
        >,
      ),
  );
const post = <T>(action: string, body: unknown) => request<T>(action, body);
export const api = {
  overview: () => get<Overview>('overview'),
  agents: () => get<Agent[]>('agents'),
  config: () => get<AgentConfig>('config'),
  chat: () => get<ChatMessage[]>('chat'),
  journal: (filter?: string) => get<JournalEvent[]>('journal', { filter }),
  instruments: (search?: string, kind?: string) =>
    get<Instrument[]>('instruments', { search, kind }),
  instrument: (id: string) => get<Instrument>('instrument', { id }),
  leaderboard: (scope = 'all') => get<LeaderboardEntry[]>('leaderboard', { scope }),
  publicProfile: (id: string) => get<PublicProfile>('profile', { id }),
  squads: () => get<Squad[]>('squads'),
  squad: (id: string) => get<Squad>('squad', { id }),
  squadMessages: (id: string) => get<ChatMessage[]>('squadMessages', { id }),
  rewards: () => get<Season>('rewards'),
  plans: () => get<Plan[]>('plans'),
  watch: () => get<User[]>('watch'),
  activities: () => get<Activity[]>('activities'),
  rejectAgentPlan: (input: { previewId: string }) => post<TradePreview>('rejectAgentPlan', input),
  saveConfig: (input: Partial<AgentConfig>) => post<AgentConfig>('saveConfig', input),
  updateProfile: (input: Partial<Pick<User, 'name' | 'avatar' | 'title' | 'privacy'>>) =>
    post<User>('updateProfile', input),
  sendMessage: (input: { text: string }) => post<ChatMessage[]>('sendMessage', input),
  previewTrade: (input: TradeInput) => post<TradePreview>('previewTrade', input),
  confirmTrade: (input: { previewId: string }) =>
    post<{ status: string; preview: TradePreview; event?: JournalEvent }>('confirmTrade', input),
  fundPortfolio: (input: { amount: string }) => post<Portfolio>('fundPortfolio', input),
  createSquad: (input: { name: string }) => post<Squad>('createSquad', input),
  joinSquad: (input: { code: string }) => post<Squad>('joinSquad', input),
  squadMessage: (squadId: string, input: { text: string }) =>
    post<ChatMessage[]>('squadMessage', { squadId, ...input }),
  saveSquadStrategy: (squadId: string, input: Partial<SquadStrategyConfig>) =>
    post<Squad>('saveSquadStrategy', { squadId, ...input }),
  simulateSquadApproval: (squadId: string, input: { decisionId: string }) =>
    post<SquadDecision>('simulateSquadApproval', { squadId, ...input }),
  simulateSquadMandate: (squadId: string) => post<Squad>('simulateSquadMandate', { squadId }),
  inviteDemoMember: (squadId: string, input: { name: string; agentId: AgentConfig['agentId'] }) =>
    post<Squad>('inviteDemoMember', { squadId, ...input }),
  applyReward: (input: { rewardId: string }) => post<AppliedReward>('applyReward', input),
  approveSquadDecision: (squadId: string, input: { decisionId: string }) =>
    post<SquadDecision>('approveSquadDecision', { squadId, ...input }),
  executeSquadDecision: (squadId: string, input: { decisionId: string }) =>
    post<SquadDecision>('executeSquadDecision', { squadId, ...input }),
  rejectSquadDecision: (squadId: string, input: { decisionId: string }) =>
    post<SquadDecision>('rejectSquadDecision', { squadId, ...input }),
  proposeContribution: (squadId: string, input: { amount: string }) =>
    post<ContributionRequest>('proposeContribution', { squadId, ...input }),
  approveContribution: (squadId: string, input: { requestId: string }) =>
    post<Squad>('approveContribution', { squadId, ...input }),
  exitPreview: (squadId: string) => post<ExitPreview>('exitPreview', { squadId }),
  confirmExit: (input: { previewId: string }) => post<ExitPreview>('confirmExit', input),
  dissolvePreview: (squadId: string) => post<DissolvePreview>('dissolvePreview', { squadId }),
  confirmDissolve: (input: { previewId: string }) =>
    post<DissolvePreview>('confirmDissolve', input),
  claimReward: (input: { rewardId: string }) => post<Reward>('claimReward', input),
  subscribePlan: (input: { planId: Plan['id'] }) => post<Plan>('subscribePlan', input),
  follow: (input: { userId: string }) => post<User>('follow', input),
  compare: (input: { agentA: string; agentB: string; task: string; budget: string }) =>
    post<Comparison>('compare', input),
  trackActivity: (input: { type: string; text: string; instrumentId?: string }) =>
    post<Activity>('trackActivity', input),
  observation: () => request<SavedObservation | null>('observation'),
  setObservationPaused: (input: { paused: boolean }) =>
    post<SavedObservation>('setObservationPaused', input),
  resetDemo: () => post<{ reset: true }>('resetDemo', {}),
  saveIdea: (input: { text: string; comparisonId?: string }) => post<Activity>('saveIdea', input),
};
