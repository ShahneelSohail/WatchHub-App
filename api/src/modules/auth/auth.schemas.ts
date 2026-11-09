import { z } from 'zod';

export const email = z.string().trim().toLowerCase().email('Invalid email format').max(255);
export const password = z.string().min(8, 'Password must be at least 8 characters long').max(100);
export const phone = z
  .string()
  .trim()
  .max(30, 'Phone number cannot exceed 30 characters')
  .transform(value => value || null)
  .nullable()
  .optional();

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email,
  phone,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required').max(200),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});
