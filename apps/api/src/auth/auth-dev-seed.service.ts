import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Credential, User } from '@gigahub/domain/identity';
import type { EnvConfig } from '@gigahub/shared/config';
import { MongoUserRepository } from './persistence/mongo-user.repository';
import { MongoCredentialRepository } from './persistence/mongo-credential.repository';
import {
  Argon2PasswordHasher,
  UuidGenerator,
} from './crypto/crypto.services';

@Injectable()
export class AuthDevSeedService implements OnModuleInit {
  private readonly logger = new Logger(AuthDevSeedService.name);

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly users: MongoUserRepository,
    private readonly credentials: MongoCredentialRepository,
    private readonly hasher: Argon2PasswordHasher,
    private readonly ids: UuidGenerator,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      return;
    }

    const email = this.config.get('AUTH_DEV_SEED_EMAIL', { infer: true });
    const existing = await this.users.findByEmail(email);
    if (existing) {
      this.logger.log(`Dev admin already present: ${email}`);
      return;
    }

    const password = this.config.get('AUTH_DEV_SEED_PASSWORD', { infer: true });
    Credential.assertPasswordPolicy(password);

    const user = User.create({
      id: this.ids.generate(),
      email,
      name: this.config.get('AUTH_DEV_SEED_NAME', { infer: true }),
      status: 'active',
    });
    const credential = Credential.create({
      id: this.ids.generate(),
      userId: user.id,
      passwordHash: await this.hasher.hash(password),
    });

    await this.users.save(user);
    await this.credentials.save(credential);
    this.logger.log(`Seeded dev admin ${email} / (AUTH_DEV_SEED_PASSWORD)`);
  }
}
