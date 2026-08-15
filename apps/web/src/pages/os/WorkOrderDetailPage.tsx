import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import {
  LuArrowLeft,
  LuCalendarClock,
  LuCar,
  LuCheck,
  LuClock,
  LuExternalLink,
  LuMapPin,
  LuMessageSquare,
  LuPhone,
  LuPlay,
  LuRefreshCw,
  LuSend,
  LuShieldAlert,
  LuUser,
  LuWrench,
} from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa';
import type { WorkOrderDetailDto } from '@gigahub/shared/contracts';
import { useAuthStore } from '../../shared/stores/auth.store';
import {
  addWorkOrderMessage,
  completeWorkOrder,
  getWorkOrderDetail,
  rescheduleWorkOrder,
  startWorkOrderDisplacement,
  startWorkOrderExecution,
} from '../../shared/api/work-orders.api';
import { routes } from '../../shared/routes';
import { useGeolocation } from '../../shared/hooks/use-geolocation';
import {
  getGoogleMapsUrl,
  getTelUrl,
  getWazeUrl,
  getWhatsAppUrl,
} from '../../shared/lib/geo-navigation';
import { toast } from '../../shared/ui/toast';
import { WorkOrderStatusChip } from './components/WorkOrderStatusChip';
import { StartExecutionModal } from './components/StartExecutionModal';
import { RescheduleModal } from './components/RescheduleModal';

export const WorkOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [order, setOrder] = useState<WorkOrderDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'mensagens' | 'checklist'>('mensagens');
  const [newMessage, setNewMessage] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modais
  const [showExecutionModal, setShowExecutionModal] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);

  const { getCurrentLocation } = useGeolocation();

  const loadDetail = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setLoading(true);
      const data = await getWorkOrderDetail(accessToken, id);
      setOrder(data);
    } catch (err: any) {
      toast.error('Erro ao carregar detalhes da OS', {
        description: err?.message || 'Ordem de serviço não encontrada.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleStartDisplacement = async () => {
    if (!accessToken || !order) return;
    try {
      setActionLoading(true);
      toast.info('Obtendo GPS…');
      const loc = await getCurrentLocation();
      await startWorkOrderDisplacement(accessToken, order.idErp, {
        location: loc ?? undefined,
      });
      toast.success('Deslocamento iniciado no IXC!');
      await loadDetail();
    } catch (err: any) {
      toast.error('Falha ao iniciar deslocamento', {
        description: err?.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExecution = async (data: {
    estimatedDurationMinutes: number;
    reason: string;
  }) => {
    if (!accessToken || !order) return;
    const loc = await getCurrentLocation();
    await startWorkOrderExecution(accessToken, order.idErp, {
      ...data,
      location: loc ?? undefined,
    });
    toast.success('Execução iniciada no IXC!');
    await loadDetail();
  };

  const handleConfirmReschedule = async (data: {
    newDate: string;
    reason: string;
  }) => {
    if (!accessToken || !order) return;
    await rescheduleWorkOrder(accessToken, order.idErp, data);
    toast.success('OS reagendada com sucesso!');
    await loadDetail();
  };

  const handleCompleteWorkOrder = async () => {
    if (!accessToken || !order) return;
    try {
      setActionLoading(true);
      toast.info('Validando geofence e posição GPS…');
      const loc = await getCurrentLocation();
      if (!loc) {
        toast.error('Localização GPS necessária', {
          description: 'Habilite o GPS no navegador para comprovar presença no local.',
        });
        return;
      }

      await completeWorkOrder(accessToken, order.idErp, {
        location: loc,
      });
      toast.success('Atendimento finalizado com sucesso no IXC!');
      await loadDetail();
    } catch (err: any) {
      toast.error('Erro ao finalizar OS', {
        description: err?.message || 'Verifique se você está dentro do raio de 300m da OS.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !order || !newMessage.trim()) return;
    try {
      setSendingMsg(true);
      await addWorkOrderMessage(accessToken, order.idErp, {
        message: newMessage.trim(),
      });
      setNewMessage('');
      toast.success('Mensagem registrada na OS!');
      await loadDetail();
    } catch (err: any) {
      toast.error('Falha ao enviar mensagem', {
        description: err?.message,
      });
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted">
        <Spinner size="lg" />
        <p className="text-xs">Carregando dados da ordem de serviço…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <LuShieldAlert className="mx-auto size-12 text-danger" />
        <h2 className="mt-3 text-lg font-bold text-foreground">
          Ordem de serviço não encontrada
        </h2>
        <p className="mt-1 text-xs text-muted">
          A OS solicitada não existe ou você não possui permissão para visualizá-la.
        </p>
        <Button
          as={Link}
          to={routes.osAgenda}
          variant="flat"
          className="mt-4"
          startContent={<LuArrowLeft className="size-4" />}
        >
          Voltar para a Agenda
        </Button>
      </div>
    );
  }

  const wazeUrl = getWazeUrl(
    order.location?.latitude,
    order.location?.longitude,
    order.customerAddress,
  );
  const mapsUrl = getGoogleMapsUrl(
    order.location?.latitude,
    order.location?.longitude,
    order.customerAddress,
  );
  const waUrl = getWhatsAppUrl(
    order.customerPhone,
    `Olá, aqui é o técnico da Giganet sobre sua ordem de serviço #${order.idErp}.`,
  );
  const telUrl = getTelUrl(order.customerPhone);

  const isAgendada = order.status === 'AG';
  const isDeslocamento = order.status === 'DS';
  const isExecucao = order.status === 'EX';
  const isFinalizada = order.status === 'F';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      {/* Topo / Voltar e Ações Globais */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            as={Link}
            to={routes.osAgenda}
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Voltar para agenda"
          >
            <LuArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Ordem de Serviço #{order.idErp}
              </h1>
              <WorkOrderStatusChip status={order.status} />
            </div>
            <p className="text-xs text-muted">
              {order.customerName} • {order.subjectName || 'Atendimento de Campo'}
            </p>
          </div>
        </div>

        {/* Botões de Ação de Status */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Atualizar"
            title="Atualizar dados"
            onPress={() => void loadDetail()}
            isLoading={loading}
          >
            <LuRefreshCw className="size-4" />
          </Button>

          {isAgendada && (
            <Button
              size="sm"
              color="warning"
              className="font-semibold shadow-xs"
              isLoading={actionLoading}
              startContent={!actionLoading && <LuCar className="size-4" />}
              onPress={handleStartDisplacement}
            >
              Iniciar Deslocamento
            </Button>
          )}

          {isDeslocamento && (
            <Button
              size="sm"
              color="success"
              className="font-semibold shadow-xs"
              startContent={<LuPlay className="size-4" />}
              onPress={() => setShowExecutionModal(true)}
            >
              Iniciar Execução
            </Button>
          )}

          {isExecucao && (
            <Button
              size="sm"
              color="success"
              className="font-semibold shadow-xs"
              isLoading={actionLoading}
              startContent={!actionLoading && <LuCheck className="size-4" />}
              onPress={handleCompleteWorkOrder}
            >
              Finalizar Atendimento
            </Button>
          )}

          {!isFinalizada && (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              startContent={<LuCalendarClock className="size-3.5" />}
              onPress={() => setShowRescheduleModal(true)}
            >
              Reagendar
            </Button>
          )}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Painel Lateral do Assinante e Endereço */}
        <div className="space-y-4 md:col-span-1">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <LuUser className="size-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Dados do Assinante
              </h2>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted block text-[11px]">Nome / Razão</span>
                <Link
                  to={routes.cadastrosClienteVisaoGeral(order.customerId)}
                  className="font-semibold text-foreground hover:text-accent transition flex items-center gap-1"
                >
                  <span className="truncate">{order.customerName}</span>
                  <LuExternalLink className="size-3 shrink-0" />
                </Link>
              </div>

              {order.customerDetails?.cnpjCpf && (
                <div>
                  <span className="text-muted block text-[11px]">CPF / CNPJ</span>
                  <span className="font-mono text-foreground">
                    {order.customerDetails.cnpjCpf}
                  </span>
                </div>
              )}

              {order.customerPhone && (
                <div>
                  <span className="text-muted block text-[11px]">Telefone</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-foreground">
                      {order.customerPhone}
                    </span>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir WhatsApp"
                      title="WhatsApp"
                      className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      <FaWhatsapp className="size-3.5" />
                    </a>
                    <a
                      href={telUrl}
                      aria-label="Ligar"
                      title="Ligar"
                      className="flex size-6 items-center justify-center rounded-md bg-muted/10 text-muted hover:text-foreground"
                    >
                      <LuPhone className="size-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {order.customerAddress && (
                <div className="border-t border-border/60 pt-2">
                  <span className="text-muted block text-[11px]">Endereço</span>
                  <p className="mt-0.5 text-foreground leading-relaxed">
                    {order.customerAddress}
                    {order.customerNeighborhood ? ` - ${order.customerNeighborhood}` : ''}
                    {order.customerCity ? `, ${order.customerCity}` : ''}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
                    >
                      <LuCar className="size-3" />
                      <span>Waze</span>
                    </a>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-foreground"
                    >
                      <LuMapPin className="size-3" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações Técnicas da OS */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <LuWrench className="size-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Parâmetros da OS
              </h2>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Assunto:</span>
              <span className="font-medium text-foreground">
                {order.subjectName || 'Atendimento'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Técnico:</span>
              <span className="font-medium text-foreground">
                {order.technicianName || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Data Agendada:</span>
              <span className="font-mono text-foreground">
                {order.scheduledAt
                  ? new Date(order.scheduledAt).toLocaleString('pt-BR')
                  : '—'}
              </span>
            </div>
            {order.executionStartedAt && (
              <div className="flex justify-between">
                <span className="text-muted">Início Execução:</span>
                <span className="font-mono text-foreground">
                  {new Date(order.executionStartedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
            {order.login && (
              <div className="flex justify-between">
                <span className="text-muted">Login PPPoE:</span>
                <span className="font-mono text-foreground">
                  {order.login}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Painel Central com Abas */}
        <div className="space-y-4 md:col-span-2">
          {/* Navegação de Abas */}
          <div className="flex items-center gap-2 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('mensagens')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === 'mensagens'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <LuMessageSquare className="size-4" />
              <span>Mensagens & Histórico</span>
              <span className="ml-1 rounded-full bg-muted/10 px-1.5 py-0.2 text-[10px] text-muted">
                {order.messages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === 'checklist'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <LuCheck className="size-4" />
              <span>Checklist & Conformidade</span>
            </button>
          </div>

          {activeTab === 'mensagens' && (
            <div className="space-y-4 pt-1">
              {order.description && (
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
                    Descrição da Abertura
                  </h3>
                  <p className="mt-1 text-xs text-foreground leading-relaxed">
                    {order.description}
                  </p>
                </div>
              )}

              {/* Linha do tempo de mensagens */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Linha do Tempo no IXC ({order.messages.length})
                </h3>

                {order.messages.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Nenhuma mensagem registrada nesta OS até o momento.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {order.messages.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-border bg-surface p-3 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="font-semibold text-foreground">
                            {m.authorName}
                          </span>
                          <span className="font-mono">
                            {new Date(m.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-foreground leading-relaxed">
                          {m.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input de Nova Mensagem */}
                <form
                  onSubmit={handleSendMessage}
                  className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-3 shadow-xs"
                >
                  <textarea
                    placeholder="Adicionar mensagem ou apontamento na OS…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      color="accent"
                      className="font-semibold"
                      isLoading={sendingMsg}
                      isDisabled={!newMessage.trim()}
                      startContent={!sendingMsg && <LuSend className="size-3.5" />}
                    >
                      Registrar Mensagem
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Validações de Campo
                  </h3>
                  <p className="mt-1 text-muted">
                    Para concluir esta ordem de serviço, o aplicativo verifica a presença física no local e os requisitos cadastrados para o assunto.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <LuMapPin className="size-4" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground block">
                        Geofence de 300 metros
                      </span>
                      <span className="text-muted text-[11px]">
                        Comprova presença física no endereço do assinante no momento da finalização.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <LuClock className="size-4" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground block">
                        Diagnóstico & Tempo de Atendimento
                      </span>
                      <span className="text-muted text-[11px]">
                        Registro de motivo mínimo ($\ge 11$ caracteres) e tempo estimado no início da execução.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <StartExecutionModal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        workOrder={order}
        onConfirm={handleConfirmExecution}
      />

      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        workOrder={order}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
};
export default WorkOrderDetailPage;
