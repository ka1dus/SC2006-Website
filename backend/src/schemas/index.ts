import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

// Subzone schemas
export const subzoneQuerySchema = z.object({
  region: z.string().optional(),
  percentile: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const subzoneIdSchema = z.object({
  id: z.string().min(1, 'Subzone ID is required'),
});

// Score schemas
export const scoreQuerySchema = z.object({
  subzoneIds: z.string().optional().transform(str => 
    str ? str.split(',').map(id => id.trim()) : undefined
  ),
  percentile: z.string().optional(),
});

// Admin schemas
export const refreshDatasetsSchema = z.object({
  force: z.boolean().optional().default(false),
  datasets: z.array(z.string()).optional(),
});

export const createSnapshotSchema = z.object({
  notes: z.string().optional(),
});

export const kernelConfigSchema = z.object({
  kernelType: z.string().default('Gaussian'),
  lambdaD: z.number().positive('Lambda D must be positive'),
  lambdaS: z.number().positive('Lambda S must be positive'),
  lambdaM: z.number().positive('Lambda M must be positive'),
  lambdaB: z.number().positive('Lambda B must be positive'),
  betaMRT: z.number().positive('Beta MRT must be positive'),
  betaBUS: z.number().positive('Beta BUS must be positive'),
  notes: z.string().optional(),
});

// Export schemas
export const exportSchema = z.object({
  subzoneId: z.string().min(1, 'Subzone ID is required'),
  format: z.enum(['pdf', 'png']).default('pdf'),
  includeDetails: z.boolean().default(true),
  includeLegend: z.boolean().default(true),
});

// Response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export const errorResponseSchema = z.object({
  success: z.boolean(),
  error: z.string(),
  details: z.any().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmResetPasswordInput = z.infer<typeof confirmResetPasswordSchema>;
export type SubzoneQueryInput = z.infer<typeof subzoneQuerySchema>;
export type SubzoneIdInput = z.infer<typeof subzoneIdSchema>;
export type ScoreQueryInput = z.infer<typeof scoreQuerySchema>;
export type RefreshDatasetsInput = z.infer<typeof refreshDatasetsSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
export type KernelConfigInput = z.infer<typeof kernelConfigSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
