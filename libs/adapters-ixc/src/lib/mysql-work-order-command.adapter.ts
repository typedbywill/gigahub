import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type {
  ActorUser,
  WorkOrderCommandRepository,
} from '@gigahub/application-work-order';
import type { GeoPoint } from '@gigahub/shared/kernel';

export class MysqlWorkOrderCommandAdapter implements WorkOrderCommandRepository {
  constructor(private readonly pool: Pool) {}

  private async insertMessage(
    idErp: number,
    authorName: string,
    idUsuario: string | number | null | undefined,
    message: string,
  ): Promise<void> {
    try {
      await this.pool.execute(
        `INSERT INTO su_oss_chamado_mensagem (id_chamado, mensagem, data_hora, id_usuario, nome_usuario)
         VALUES (?, ?, NOW(), ?, ?)`,
        [idErp, message, idUsuario ?? 0, authorName],
      );
    } catch {
      // Falha não-bloqueante no log de mensagens
    }
  }

  async startDisplacement(
    idErp: string,
    technician: ActorUser,
    location?: GeoPoint,
  ): Promise<void> {
    const idNum = Number(idErp);
    if (Number.isNaN(idNum) || idNum <= 0) {
      throw new Error(`ID de OS inválido: ${idErp}`);
    }

    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE su_oss_chamado
       SET status = 'DS'
       WHERE id = ?`,
      [idNum],
    );

    if (result.affectedRows === 0) {
      throw new Error(`Ordem de serviço ${idErp} não encontrada no IXC`);
    }

    const gpsText = location
      ? ` (GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`
      : '';
    const msg = `[GigaHub] Deslocamento iniciado por ${technician.name}${gpsText}`;
    await this.insertMessage(
      idNum,
      technician.name,
      technician.idErp ?? technician.idErpEmployee,
      msg,
    );
  }

  async startExecution(
    idErp: string,
    input: {
      technician: ActorUser;
      estimatedDurationMinutes: number;
      reason: string;
      location?: GeoPoint;
    },
  ): Promise<void> {
    const idNum = Number(idErp);
    if (Number.isNaN(idNum) || idNum <= 0) {
      throw new Error(`ID de OS inválido: ${idErp}`);
    }

    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE su_oss_chamado
       SET status = 'EX',
           data_inicio = COALESCE(data_inicio, NOW())
       WHERE id = ?`,
      [idNum],
    );

    if (result.affectedRows === 0) {
      throw new Error(`Ordem de serviço ${idErp} não encontrada no IXC`);
    }

    const msg = `[GigaHub] Execução iniciada por ${input.technician.name}. Previsão: ${input.estimatedDurationMinutes} min. Motivo: ${input.reason}`;
    await this.insertMessage(
      idNum,
      input.technician.name,
      input.technician.idErp ?? input.technician.idErpEmployee,
      msg,
    );
  }

  async reschedule(
    idErp: string,
    input: {
      technician: ActorUser;
      newDate: string;
      reason: string;
    },
  ): Promise<void> {
    const idNum = Number(idErp);
    if (Number.isNaN(idNum) || idNum <= 0) {
      throw new Error(`ID de OS inválido: ${idErp}`);
    }

    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE su_oss_chamado
       SET status = 'RAG',
           data_agenda = ?
       WHERE id = ?`,
      [input.newDate, idNum],
    );

    if (result.affectedRows === 0) {
      throw new Error(`Ordem de serviço ${idErp} não encontrada no IXC`);
    }

    const msg = `[GigaHub] Reagendamento solicitado por ${input.technician.name} para ${input.newDate}. Motivo: ${input.reason}`;
    await this.insertMessage(
      idNum,
      input.technician.name,
      input.technician.idErp ?? input.technician.idErpEmployee,
      msg,
    );
  }

  async complete(
    idErp: string,
    input: {
      technician: ActorUser;
      location: GeoPoint;
      reason?: string;
      answers?: Record<string, unknown>;
    },
  ): Promise<void> {
    const idNum = Number(idErp);
    if (Number.isNaN(idNum) || idNum <= 0) {
      throw new Error(`ID de OS inválido: ${idErp}`);
    }

    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE su_oss_chamado
       SET status = 'F',
           data_fechamento = NOW()
       WHERE id = ?`,
      [idNum],
    );

    if (result.affectedRows === 0) {
      throw new Error(`Ordem de serviço ${idErp} não encontrada no IXC`);
    }

    const reasonText = input.reason ? ` - ${input.reason}` : '';
    const msg = `[GigaHub] Atendimento finalizado por ${input.technician.name}${reasonText}`;
    await this.insertMessage(
      idNum,
      input.technician.name,
      input.technician.idErp ?? input.technician.idErpEmployee,
      msg,
    );
  }

  async addMessage(
    idErp: string,
    input: {
      authorName: string;
      message: string;
    },
  ): Promise<void> {
    const idNum = Number(idErp);
    if (Number.isNaN(idNum) || idNum <= 0) {
      throw new Error(`ID de OS inválido: ${idErp}`);
    }

    await this.insertMessage(idNum, input.authorName, null, input.message);
  }
}
