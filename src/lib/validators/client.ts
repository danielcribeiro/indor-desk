import { z } from 'zod';

export const createClientSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  birth_date: z
    .string()
    .optional()
    .nullable(),
  gender: z
    .string()
    .optional()
    .nullable(),
  guardian_name: z
    .string()
    .min(2, 'Nome do responsável deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do responsável deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  guardian_phone: z
    .string()
    .optional()
    .nullable(),
  guardian_email: z
    .string()
    .email('Email inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .optional()
    .nullable(),
  google_drive_link: z
    .string()
    .url('URL do Google Drive inválida')
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z
    .string()
    .optional()
    .nullable(),
  custom_fields: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

