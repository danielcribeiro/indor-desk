import { z } from 'zod';

export const createStageSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .optional()
    .nullable(),
  order_index: z
    .number()
    .int()
    .min(1, 'Ordem deve ser maior que 0'),
  is_active: z.boolean().default(true),
});

export const updateStageSchema = createStageSchema.partial();

export const createActivitySchema = z.object({
  stage_id: z.string().uuid('ID da etapa inválido'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  description: z
    .string()
    .optional()
    .nullable(),
  order_index: z
    .number()
    .int()
    .min(1, 'Ordem deve ser maior que 0'),
  is_required: z.boolean().default(true),
});

export const updateActivitySchema = createActivitySchema.partial().omit({ stage_id: true });

export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

