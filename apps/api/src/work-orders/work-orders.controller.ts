import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  AddWorkOrderMessageUseCase,
  CompleteWorkOrderUseCase,
  GetMyScheduleUseCase,
  GetWorkOrderDetailUseCase,
  ListActiveWorkOrdersUseCase,
  ListCustomerWorkOrdersUseCase,
  ListWorkOrdersUseCase,
  RescheduleWorkOrderUseCase,
  StartWorkOrderDisplacementUseCase,
  StartWorkOrderExecutionUseCase,
} from '@gigahub/application-work-order';
import {
  addWorkOrderMessageDtoSchema,
  completeWorkOrderDtoSchema,
  myScheduleQueryDtoSchema,
  rescheduleWorkOrderDtoSchema,
  startDisplacementDtoSchema,
  startExecutionDtoSchema,
  workOrderListQueryDtoSchema,
  type WorkOrderDetailDto,
  type WorkOrderListResponseDto,
  type WorkOrderSummaryDto,
} from '@gigahub/shared/contracts';
import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('work-orders')
@UseGuards(AccessTokenGuard)
export class WorkOrdersController {
  constructor(
    private readonly getMyScheduleUseCase: GetMyScheduleUseCase,
    private readonly listActiveWorkOrdersUseCase: ListActiveWorkOrdersUseCase,
    private readonly listWorkOrdersUseCase: ListWorkOrdersUseCase,
    private readonly getWorkOrderDetailUseCase: GetWorkOrderDetailUseCase,
    private readonly startDisplacementUseCase: StartWorkOrderDisplacementUseCase,
    private readonly startExecutionUseCase: StartWorkOrderExecutionUseCase,
    private readonly rescheduleUseCase: RescheduleWorkOrderUseCase,
    private readonly completeUseCase: CompleteWorkOrderUseCase,
    private readonly addMessageUseCase: AddWorkOrderMessageUseCase,
    private readonly listCustomerWorkOrdersUseCase: ListCustomerWorkOrdersUseCase,
  ) {}

  @Get('minha-agenda')
  async minhaAgenda(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<WorkOrderSummaryDto[]> {
    const parsed = myScheduleQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Parâmetros de busca da agenda inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.getMyScheduleUseCase.execute({
        actorUserId: this.requireUserId(req),
        query: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('em-andamento')
  async emAndamento(
    @Req() req: AuthenticatedRequest,
    @Query('onlyMine') onlyMine?: string,
  ): Promise<WorkOrderSummaryDto[]> {
    try {
      return await this.listActiveWorkOrdersUseCase.execute({
        actorUserId: this.requireUserId(req),
        onlyMine: onlyMine === 'true' || onlyMine === '1',
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('todas')
  async todas(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<WorkOrderListResponseDto> {
    const parsed = workOrderListQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Parâmetros de listagem inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.listWorkOrdersUseCase.execute({
        actorUserId: this.requireUserId(req),
        query: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('cliente/:customerId')
  async cliente(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ): Promise<WorkOrderSummaryDto[]> {
    try {
      return await this.listCustomerWorkOrdersUseCase.execute({
        actorUserId: this.requireUserId(req),
        customerIdErp: customerId,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':id')
  async detalhe(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<WorkOrderDetailDto> {
    try {
      return await this.getWorkOrderDetailUseCase.execute({
        actorUserId: this.requireUserId(req),
        idOrIdErp: id,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/deslocamento')
  async iniciarDeslocamento(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: boolean; status: string }> {
    const parsed = startDisplacementDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Dados de deslocamento inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.startDisplacementUseCase.execute({
        actorUserId: this.requireUserId(req),
        workOrderId: id,
        body: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/execucao')
  async iniciarExecucao(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: boolean; status: string }> {
    const parsed = startExecutionDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Dados de início de execução inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.startExecutionUseCase.execute({
        actorUserId: this.requireUserId(req),
        workOrderId: id,
        body: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/reagendar')
  async reagendar(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: boolean; status: string }> {
    const parsed = rescheduleWorkOrderDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Dados de reagendamento inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.rescheduleUseCase.execute({
        actorUserId: this.requireUserId(req),
        workOrderId: id,
        body: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/finalizar')
  async finalizar(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: boolean; status: string }> {
    const parsed = completeWorkOrderDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Dados de finalização inválidos',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.completeUseCase.execute({
        actorUserId: this.requireUserId(req),
        workOrderId: id,
        body: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/mensagens')
  async adicionarMensagem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: boolean }> {
    const parsed = addWorkOrderMessageDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Mensagem inválida',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.addMessageUseCase.execute({
        actorUserId: this.requireUserId(req),
        workOrderId: id,
        body: parsed.data,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private requireUserId(req: AuthenticatedRequest): string {
    if (!req.userId) {
      throw new BadRequestException({
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado',
      });
    }
    return req.userId;
  }

  private handleError(error: unknown): never {
    if (error instanceof DomainError) {
      if (
        error.code === DomainErrorCodes.InvalidStatusTransition ||
        error.code === DomainErrorCodes.InvariantViolation
      ) {
        throw new BadRequestException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
    }

    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.NotFound) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error.code === ApplicationErrorCodes.PermissionDenied) {
        throw new ForbiddenException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (
        error.code === ApplicationErrorCodes.ValidationError ||
        error.code === ApplicationErrorCodes.InvariantViolation ||
        error.code === ApplicationErrorCodes.UserNotFound
      ) {
        throw new BadRequestException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
    }

    throw error;
  }
}
