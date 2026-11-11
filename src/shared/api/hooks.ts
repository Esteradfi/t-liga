import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: api.overview });
export const useAgents = () =>
  useQuery({ queryKey: ['agents'], queryFn: api.agents, staleTime: Infinity });
export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: api.config });
export const useChat = () => useQuery({ queryKey: ['chat'], queryFn: api.chat });
export const useJournal = (filter?: string) =>
  useQuery({ queryKey: ['journal', filter], queryFn: () => api.journal(filter) });
export const useInstruments = (search?: string, kind?: string) =>
  useQuery({
    queryKey: ['instruments', search, kind],
    queryFn: () => api.instruments(search, kind),
  });
export const useInstrument = (id: string) =>
  useQuery({ queryKey: ['instrument', id], queryFn: () => api.instrument(id), enabled: !!id });
export const useLeaderboard = (scope: 'all' | 'friends' | 'squads' = 'all') =>
  useQuery({ queryKey: ['leaderboard', scope], queryFn: () => api.leaderboard(scope) });
export const usePublicProfile = (id: string) =>
  useQuery({ queryKey: ['profile', id], queryFn: () => api.publicProfile(id), enabled: !!id });
export const useSquads = () => useQuery({ queryKey: ['squads'], queryFn: api.squads });
export const useSquad = (id: string) =>
  useQuery({ queryKey: ['squad', id], queryFn: () => api.squad(id), enabled: !!id });
export const useSquadMessages = (id: string) =>
  useQuery({
    queryKey: ['squadMessages', id],
    queryFn: () => api.squadMessages(id),
    enabled: !!id,
  });
export const useRewards = () => useQuery({ queryKey: ['rewards'], queryFn: api.rewards });
export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: api.plans });
export const useWatch = () => useQuery({ queryKey: ['watch'], queryFn: api.watch });
export const useActivities = () => useQuery({ queryKey: ['activities'], queryFn: api.activities });
function useApiMutation<A, R>(mutationFn: (input: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'agents' }),
  });
}
export const useSaveConfig = () => useApiMutation(api.saveConfig);
export const useUpdateProfile = () => useApiMutation(api.updateProfile);
export const useSendMessage = () => useApiMutation(api.sendMessage);
export const usePreviewTrade = () => useApiMutation(api.previewTrade);
export const useConfirmTrade = () => useApiMutation(api.confirmTrade);
export const useFundPortfolio = () => useApiMutation(api.fundPortfolio);
export const useCreateSquad = () => useApiMutation(api.createSquad);
export const useJoinSquad = () => useApiMutation(api.joinSquad);
export const useSquadMessage = (id: string) =>
  useApiMutation((v: Parameters<typeof api.squadMessage>[1]) => api.squadMessage(id, v));
export const useSaveSquadStrategy = (id: string) =>
  useApiMutation((v: Parameters<typeof api.saveSquadStrategy>[1]) => api.saveSquadStrategy(id, v));
export const useApproveSquadDecision = (id: string) =>
  useApiMutation((v: { decisionId: string }) => api.approveSquadDecision(id, v));
export const useExecuteSquadDecision = (id: string) =>
  useApiMutation((v: { decisionId: string }) => api.executeSquadDecision(id, v));
export const useRejectSquadDecision = (id: string) =>
  useApiMutation((v: { decisionId: string }) => api.rejectSquadDecision(id, v));
export const useProposeContribution = (id: string) =>
  useApiMutation((v: { amount: string }) => api.proposeContribution(id, v));
export const useApproveContribution = (id: string) =>
  useApiMutation((v: { requestId: string }) => api.approveContribution(id, v));
export const useExitPreview = (id: string) => useApiMutation(() => api.exitPreview(id));
export const useConfirmExit = (_id?: string) => useApiMutation(api.confirmExit);
export const useDissolvePreview = (id: string) => useApiMutation(() => api.dissolvePreview(id));
export const useConfirmDissolve = (_id?: string) => useApiMutation(api.confirmDissolve);
export const useClaimReward = () => useApiMutation(api.claimReward);
export const useSubscribePlan = () => useApiMutation(api.subscribePlan);
export const useFollow = () => useApiMutation(api.follow);
export const useCompare = () => useApiMutation(api.compare);
export const useTrackActivity = () => useApiMutation(api.trackActivity);
export const useSaveIdea = () => useApiMutation(api.saveIdea);

export const useConfirmAgentPlan = () => useApiMutation(api.confirmTrade);
export const useRejectAgentPlan = () => useApiMutation(api.rejectAgentPlan);

export const useSimulateSquadApproval = (id: string) =>
  useApiMutation((v: { decisionId: string }) => api.simulateSquadApproval(id, v));
export const useSimulateSquadMandate = (id: string) =>
  useApiMutation(() => api.simulateSquadMandate(id));
export const useInviteDemoMember = (id: string) =>
  useApiMutation((v: Parameters<typeof api.inviteDemoMember>[1]) => api.inviteDemoMember(id, v));
export const useApplyReward = () => useApiMutation(api.applyReward);

export const useObservation = () =>
  useQuery({ queryKey: ['observation'], queryFn: api.observation });
export const useSetObservationPaused = () => useApiMutation(api.setObservationPaused);
export const useResetDemo = () => useApiMutation(api.resetDemo);
