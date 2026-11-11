import { z } from 'zod';
const decimal = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max,
      `Число от ${min} до ${max}`,
    );
export const squadStrategySchema = z.object({
  strategy: z.string().trim().min(3).max(500),
  goal: z.string().trim().min(3).max(500),
  horizon: z.enum(['short', 'medium', 'long']),
  approach: z.enum(['cautious', 'balanced', 'active']),
  mode: z.enum(['confirm', 'autonomous']),
  leverage: z.boolean(),
  short: z.boolean(),
  derivatives: z.boolean(),
  maxPositionPercent: decimal(1, 100),
  maxLeverage: decimal(1, 5),
  costLimit: decimal(0, 100000000),
});
