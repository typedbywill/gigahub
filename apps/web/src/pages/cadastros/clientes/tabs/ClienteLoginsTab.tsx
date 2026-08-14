import React from 'react';
import {
  LuActivity,
  LuGlobe,
  LuKey,
  LuNetwork,
  LuRadio,
  LuServer,
  LuShieldCheck,
  LuWifi,
} from 'react-icons/lu';
import { useCustomerContext } from '../CustomerContext';
import { StatusBadge } from '../../../../shared/ui/StatusBadge';

function formatDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export const ClienteLoginsTab: React.FC = () => {
  const { consultation, loading } = useCustomerContext();
  const logins = consultation?.data?.logins?.items ?? [];
  const fibra = consultation?.data?.fibra?.items ?? [];
  const sinal = consultation?.data?.sinal;
  const fibraHistorico = consultation?.data?.fibraHistorico?.items ?? [];
  const senhasWifi = consultation?.data?.senhasWifi?.lines ?? [];
  const acessoRemoto = consultation?.data?.acessoRemoto;

  if (loading && logins.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Carregando logins e parâmetros de rede…
      </div>
    );
  }

  if (logins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <LuNetwork className="size-10 text-muted/60" />
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          Nenhum login cadastrado
        </h3>
        <p className="mt-1 text-xs text-muted">
          Este cliente não possui credenciais de autenticação ativas.
        </p>
      </div>
    );
  }

  // Mapear dados de fibra pelo loginIdErp ou índice
  const fibraByLoginId = new Map(fibra.map((f) => [f.loginIdErp, f]));

  return (
    <div className="space-y-6">
      {/* Cards de Logins */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {logins.map((login) => {
          const fibraInfo = fibraByLoginId.get(login.idErp) || fibra[0];

          return (
            <div
              key={login.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <LuNetwork className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-foreground">
                      {login.login || `Login #${login.idErp}`}
                    </h3>
                    <p className="text-xs text-muted">Contrato ERP: #{login.contractIdErp || '-'}</p>
                  </div>
                </div>
                <StatusBadge variant={login.active ? 'success' : 'neutral'}>
                  {login.active ? 'Ativo' : 'Inativo'}
                </StatusBadge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted">Endereço IP:</span>
                  <p className="mt-0.5 font-mono font-medium text-foreground">
                    {login.ip || 'Dinâmico / CGNAT'}
                  </p>
                </div>
                <div>
                  <span className="text-muted">ID ERP:</span>
                  <p className="mt-0.5 font-mono font-medium text-foreground">
                    #{login.idErp}
                  </p>
                </div>

                {fibraInfo?.onuSerial ? (
                  <div>
                    <span className="text-muted">Serial ONU:</span>
                    <p className="mt-0.5 font-mono font-medium text-foreground">
                      {fibraInfo.onuSerial}
                    </p>
                  </div>
                ) : null}

                {fibraInfo?.mac ? (
                  <div>
                    <span className="text-muted">Endereço MAC:</span>
                    <p className="mt-0.5 font-mono font-medium text-foreground">
                      {fibraInfo.mac}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Status de Sinal Óptico Atual */}
              {sinal?.value ? (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-default/40 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <LuRadio className="size-4 text-accent" />
                    <span className="font-medium text-foreground">Potência Óptica (Rx):</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-success">
                    {sinal.value} dBm
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Seção Adicional: Senhas Wi-Fi e Acesso Remoto */}
      {(senhasWifi.length > 0 || acessoRemoto) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {senhasWifi.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="mb-4 flex items-center gap-2">
                <LuWifi className="size-5 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Parâmetros Wi-Fi</h3>
              </div>
              <ul className="divide-y divide-border/60 font-mono text-xs text-foreground">
                {senhasWifi.map((line, idx) => (
                  <li key={idx} className="py-2">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acessoRemoto && (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="mb-4 flex items-center gap-2">
                <LuServer className="size-5 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Acesso Remoto</h3>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-muted">
                  IP de Gerência: <span className="font-mono text-foreground">{acessoRemoto.ip}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {acessoRemoto.ports.map((p) => (
                    <span
                      key={p.port}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs ${
                        p.isOpen
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      Porta {p.port}: {p.isOpen ? 'Aberta' : 'Fechada'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico de Sinal Óptico */}
      {fibraHistorico.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <LuActivity className="size-5 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Histórico de Potência Óptica</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-default/40 text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Data / Hora</th>
                  <th className="px-4 py-2.5">Sinal Rx (dBm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {fibraHistorico.map((h, i) => (
                  <tr key={i} className="hover:bg-default/30">
                    <td className="px-4 py-2 text-muted">{formatDate(h.recordedAt)}</td>
                    <td className="px-4 py-2 font-mono font-medium text-foreground">
                      {h.signalRx != null ? `${h.signalRx.toFixed(2)} dBm` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
