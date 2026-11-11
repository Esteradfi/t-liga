import { z } from 'zod';
export const tradeSchema = z.object({
  instrumentId: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  lots: z.number().int().positive().max(1000000),
  source: z.enum(['manual', 'agent']).optional(),
});
