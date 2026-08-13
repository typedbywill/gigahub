import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  ApplicationError,
  ApplicationErrorCodes,
  LoginUseCase,
  RenewTokenUseCase,
} from '@gigahub/application-identity';
import {
  loginRequestDtoSchema,
  type LoginResponseDto,
  type RenewTokenResponseDto,
} from '@gigahub/shared/contracts';
import type { EnvConfig } from '@gigahub/shared/config';
import { setRefreshCookie } from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly renewTokenUseCase: RenewTokenUseCase,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const parsed = loginRequestDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid login payload',
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = await this.loginUseCase.execute({
        email: parsed.data.email,
        password: parsed.data.password,
        deviceLabel: req.headers['user-agent']?.slice(0, 200),
      });
      setRefreshCookie(res, this.config, result.refreshToken);
      return {
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      this.rethrowAuthError(error);
    }
  }

  @Post('renew-token')
  @HttpCode(HttpStatus.OK)
  async renewToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RenewTokenResponseDto> {
    const cookieName = this.config.get('AUTH_COOKIE_NAME', { infer: true });
    const refreshToken = req.cookies?.[cookieName] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException({
        error: ApplicationErrorCodes.InvalidRefreshToken,
        message: 'Refresh token cookie is missing',
      });
    }

    try {
      const result = await this.renewTokenUseCase.execute({ refreshToken });
      setRefreshCookie(res, this.config, result.refreshToken);
      return {
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      this.rethrowAuthError(error);
    }
  }

  private rethrowAuthError(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.InvalidCredentials) {
        throw new UnauthorizedException({
          error: error.code,
          message: error.message,
        });
      }
      if (error.code === ApplicationErrorCodes.RefreshTokenReuse) {
        throw new ForbiddenException({
          error: error.code,
          message: error.message,
        });
      }
      throw new UnauthorizedException({
        error: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
