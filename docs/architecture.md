# Т-Лига — React frontend contract

Standalone React/TS/Vite app. No backend or real trades, LLM, payments. MSW HTTP API is simulated server; its database persists separately in localStorage. Zustand only session/theme/client prefs. TanStack Query owns fetched state.

## Ownership

Architect: root package/TS/Vite configuration; `src/app/providers`, `src/shared/api`, `src/shared/lib`, `src/entities`, `src/features/model`, `src/mocks`, `src/main.tsx`.
Frontend: `src/pages`, `src/widgets`, `src/shared/ui`, CSS/modules/assets, `src/app/router.tsx`, `src/app/App.tsx` if needed.
QA: tests, Storybook, ESLint/Prettier/Husky config. Do not edit package concurrently; ask architect for dependency changes.

## Router

Frontend exports `router` from `src/app/router.tsx` (createBrowserRouter). Entry will render `<RouterProvider router={router}/>` inside QueryClientProvider, Radix Tooltip.Provider; starts MSW before mount.
Routes: `/`, `/agents`, `/chat`, `/arena`, `/profiles/:userId`, `/market`, `/market/:instrumentId`, `/trade/:instrumentId`, `/squads`, `/squads/:squadId`, `/squads/:squadId/chat`, `/squads/:squadId/decisions`, `/journal`, `/season`, `/plans`, `/compare`, `/watch`, `/settings`, `/profile`. Can adapt nested routing without changing API.

## Shared contracts

`src/shared/api/contracts.ts`: exported types Agent, AgentConfig, User, Instrument, Portfolio, Position, ChatMessage, JournalEvent, LeaderboardEntry, PublicProfile, Squad, SquadMember, SquadDecision, ContributionRequest, ExitPreview, Reward, Season, Plan, Comparison, Activity, Overview. Money = decimal string RUB; IDs = strings. AgentId = 'max'|'lev'|'chill'.
`src/shared/api/client.ts`: typed `api` object Promise methods.
`src/shared/api/hooks.ts`: all hooks below using TanStack Query, invalidate related queries after mutations.
`src/shared/lib/money.ts`: money(value), percent(value), Decimal helper.
`src/entities/session/model/store.ts`: useSessionStore { userId:'me', theme:'light'|'dark', setTheme, activeSquadId, setActiveSquadId }. No money/config mirrored here.

## Hook exports (stable)

Queries: useOverview(), useAgents(), useConfig(), useChat(), useJournal(filter?:string), useInstruments(search?:string,kind?:string), useInstrument(id), useLeaderboard(scope?:'all'|'friends'|'squads'), usePublicProfile(id), useSquads(), useSquad(id), useSquadMessages(id), useRewards(), usePlans(), useWatch(), useActivities().
Mutations: useSaveConfig() mutate(Partial<AgentConfig>), useSendMessage() mutate({text}), usePreviewTrade() mutate({instrumentId,side:'buy'|'sell',lots:number}), useConfirmTrade() mutate({previewId}), useCreateSquad() mutate({name}), useJoinSquad() mutate({code}), useSquadMessage(id) mutate({text}), useProposeContribution(id) mutate({amount}), useApproveContribution(id) mutate({requestId}), useExitPreview(id) mutate(), useConfirmExit(id) mutate({previewId}), useDissolvePreview(id) mutate(), useConfirmDissolve(id) mutate({previewId}), useClaimReward() mutate({rewardId}), useSubscribePlan() mutate({planId}), useFollow() mutate({userId}), useCompare() mutate({agentA,agentB,task,budget}), useTrackActivity() mutate({type,text,instrumentId?}).
All mutation results typed via API; error ApiError exposes message/code/status. React Query loading/error UI required.
Trade preview persists immutable quote/config version; confirm rechecks funds/positions and single-use idempotency. Manual trades allowed while agent paused. Squad full exit only; topup stays pending until approval, snapshot/unit accounting preserves pre-contribution profit. Earned-only title selection. Claims idempotent. Private profile API redacts holdings/trades before UI receives them.

## Test reset

`src/mocks/db.ts`: exported createSeedDb(), resetMockDb(), getMockDb(). `src/mocks/handlers.ts` exports handlers. `src/mocks/browser.ts` exports worker. deterministic faker seed. Browser `?reset=1` resets mock db before start; `?mockError=1` API forced error for UI QA.

## Implemented additions

- Public entity APIs: `entities/agent`, `portfolio`, `market`, `profile`, `squad`, `season`, `journal`, `comparison`, `session`.
- `useUpdateProfile`, `useFundPortfolio`, `useSaveIdea`, `useSaveSquadStrategy`, decision approve/reject/execute hooks, `useConfirmAgentPlan`, `useRejectAgentPlan` are implemented.
- `ChatMessage.plan?: TradePreview`: explicit affirmative command is parsed only when the whole message matches `Купи GOLD 1 лот` / `Продай SBER 1 лот`. Negations, conditional phrases and unsupported leverage suffixes never execute. Confirm mode produces preview; autonomous mode executes only after onboarding/rights/budget/position/cost checks. Preview is revision-bound, expiring, cancellable and single-use.
- Portfolio performance uses units/NAV: mock top-up adds units at current NAV and net contributions, leaving profit and percentage performance unchanged. UI monetary presentation may use number formatting; arithmetic remains Decimal.
- Public profiles of other users use independent mock holdings/history; only own profile reads own portfolio and journal. Closed profiles return 403 and results-only profiles redact financial arrays.
- Saving squad strategy creates a proposal with `proposedStrategy`; active strategy changes only after explicit demo approval and execution. Contributions remain pending until explicit simulated team approval. New units are issued at current NAV. Full exit uses revision-bound snapshot; no partial exit and no real payout.
- Ordinary analysis tasks have a persisted monthly counter and tariff limits; one clarification does not charge a new task. Deep quotas remain preliminary tariff data, not GPU metering. Safety/manual/confirm operations do not consume chat quota. Mock billing never claims real payment.
