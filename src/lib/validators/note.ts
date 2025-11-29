import { z } from 'zod';

export const createNoteSchema = z.object({
  client_id: z.string().uuid('ID do cliente inválido'),
  stage_id: z
    .string()
    .uuid('ID da etapa inválido')
    .optional()
    .nullable(),
  activity_id: z
    .string()
    .uuid('ID da atividade inválido')
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, 'Conteúdo é obrigatório')
    .max(5000, 'Conteúdo deve ter no máximo 5000 caracteres'),
  // Campos para pendência
  creates_pending_task: z.boolean().optional().default(false),
  pending_task_profile_id: z
    .string()
    .uuid('ID do perfil inválido')
    .optional()
    .nullable(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

