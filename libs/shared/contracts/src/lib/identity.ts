import { z } from 'zod';

export const userStatusSchema = z.enum(['active', 'blocked']);

export const publicUserDtoSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  status: userStatusSchema,
});

export type PublicUserDto = z.infer<typeof publicUserDtoSchema>;

export const loginRequestDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequestDto = z.infer<typeof loginRequestDtoSchema>;

export const loginResponseDtoSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserDtoSchema,
});

export type LoginResponseDto = z.infer<typeof loginResponseDtoSchema>;

export const renewTokenResponseDtoSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserDtoSchema,
});

export type RenewTokenResponseDto = z.infer<typeof renewTokenResponseDtoSchema>;

/** @deprecated Prefer PublicUserDto once auth is wired. */
export interface UserStub {
  id: string;
  email: string;
  name: string;
}
