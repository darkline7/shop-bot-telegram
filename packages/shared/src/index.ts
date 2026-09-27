import { z } from 'zod';
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().optional() });
export type ApiError = { success: false; error: { code: string; message: string } };
export const moneySchema = z.coerce.number().finite().positive().max(1_000_000_000);
