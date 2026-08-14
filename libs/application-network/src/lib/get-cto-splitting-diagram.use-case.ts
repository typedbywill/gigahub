import {
  CtoSplittingDiagram,
  type CtoSplittingDiagramSnapshot,
} from '@gigahub/domain/fiber-access-terminal';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type CtoSplittingDiagramQuery,
} from './ports';

export interface GetCtoSplittingDiagramInput {
  fatId: string;
}

export class GetCtoSplittingDiagramUseCase {
  constructor(private readonly query: CtoSplittingDiagramQuery) {}

  async execute(
    input: GetCtoSplittingDiagramInput,
  ): Promise<CtoSplittingDiagramSnapshot> {
    const trimmedId = (input.fatId ?? '').trim();
    if (!trimmedId) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidSearchQuery,
        'FAT ID cannot be empty',
      );
    }

    const readModel = await this.query.findByFatId(trimmedId);
    if (!readModel) {
      throw new ApplicationError(
        ApplicationErrorCodes.FatNotFound,
        `FAT with ID ${trimmedId} was not found`,
        { fatId: trimmedId },
      );
    }

    const diagram = CtoSplittingDiagram.create({
      fatId: readModel.fatId,
      fatName: readModel.fatName,
      nodes: readModel.nodes,
      connections: readModel.connections.map((c) => ({
        ...c,
        trayNumber: c.trayNumber ?? 1,
      })),
    });

    return diagram.toSnapshot();
  }
}
