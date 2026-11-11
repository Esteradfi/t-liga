import { z } from 'zod';
const finiteDecimal = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max,
      `Число от ${min} до ${max}`,
    );
export const configSchema = z.object({
  agentId: z.enum(['max', 'lev', 'chill']),
  priority: z.string().max(300).optional(),
  goal: z.string().trim().min(3).max(300),
  horizon: z.string().min(1),
  budget: finiteDecimal(1000, 100000000),
  mode: z.enum(['confirm', 'autonomous']),
  paused: z.boolean(),
  leverage: z.boolean(),
  maxLeverage: finiteDecimal(1, 5),
  short: z.boolean(),
  derivatives: z.boolean(),
  maxPositionPercent: finiteDecimal(1, 100),
  costLimit: finiteDecimal(0, 1000000),
  instruments: z.array(z.enum(['shares', 'bonds', 'funds', 'metals'])).min(1),
  communication: z.enum(['business', 'friendly', 'energetic']),
  revision: z.number().int(),
  onboardingComplete: z.boolean(),
  agentSelected: z.boolean().optional(),
});
