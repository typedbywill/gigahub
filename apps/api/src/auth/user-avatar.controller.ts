import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  GetUserAvatarUseCase,
} from '@gigahub/application-identity';
import type { Response } from 'express';

@Controller('users')
export class UserAvatarController {
  constructor(private readonly getUserAvatar: GetUserAvatarUseCase) {}

  @Get(':id/avatar')
  @Header('Cache-Control', 'public, max-age=300')
  async serveAvatar(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const file = await this.getUserAvatar.execute({ userId: id });
      res.set('Content-Type', file.contentType);
      res.send(file.body);
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === ApplicationErrorCodes.NotFound
      ) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  }
}
