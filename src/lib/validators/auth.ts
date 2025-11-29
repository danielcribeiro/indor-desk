import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Usuário deve ter pelo menos 3 caracteres')
    .max(50, 'Usuário deve ter no máximo 50 caracteres')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Usuário deve conter apenas letras, números e underscore'
    ),
  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Usuário deve ter pelo menos 3 caracteres')
    .max(50, 'Usuário deve ter no máximo 50 caracteres')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Usuário deve conter apenas letras, números e underscore'
    ),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  phone: z
    .string()
    .optional()
    .nullable(),
  role: z.enum(['admin', 'operator']).default('operator'),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  phone: z
    .string()
    .optional()
    .nullable(),
  role: z.enum(['admin', 'operator']).optional(),
  is_active: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

