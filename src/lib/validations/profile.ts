import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type ProfileDto = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
};

export function toProfileDto(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}): ProfileDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}
