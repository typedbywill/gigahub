import type { PublicUserDto } from '@gigahub/shared/contracts';
import type { User } from '@gigahub/domain/identity';

export function toPublicUserDto(user: User): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
  };
}
