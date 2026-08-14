import React from 'react';
import {
  LuBox,
  LuBuilding2,
  LuCalendar,
  LuCheck,
  LuExternalLink,
  LuGlobe,
  LuIdCard,
  LuMail,
  LuMapPin,
  LuPhone,
  LuSmartphone,
  LuUser,
} from 'react-icons/lu';
import { Button } from '@heroui/react';
import { useCustomerContext } from '../CustomerContext';
import { ClienteMapCard } from '../components/ClienteMapCard';
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

function formatCpfCnpj(value?: string): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

function formatPhone(value?: string): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

function formatCep(value?: string): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 8) {
    return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return value;
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function DataField({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span
        className={`text-sm ${mono ? 'font-mono' : ''} ${
          highlight ? 'font-semibold text-accent' : 'text-foreground'
        }`}
      >
        {value || '-'}
      </span>
    </div>
  );
}

export const ClienteVisaoGeralTab: React.FC = () => {
  const { consultation, loading } = useCustomerContext();
  const cliente = consultation?.data?.cadastro;
  const comodatos = consultation?.data?.comodatos?.items ?? [];

  if (loading && !cliente) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Carregando visão geral do cliente…
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
        Dados cadastrais não encontrados.
      </div>
    );
  }

  const address = cliente.address;
  const addressFormatted = [
    address?.street && `${address.street}${address.number ? `, ${address.number}` : ''}`,
    address?.neighborhood,
    address?.city && `${address.city}${address.state ? ` - ${address.state}` : ''}`,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Dados Cadastrais e Pessoais */}
      <SectionCard
        title="Informações Cadastrais"
        subtitle="Identificação e dados de registro do cliente"
        icon={<LuUser className="size-5" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DataField label="Nome Completo" value={cliente.name} highlight />
          <DataField label="ID ERP (IXC)" value={cliente.idErp} mono />
          <DataField label="CPF / CNPJ" value={formatCpfCnpj(cliente.document)} mono />
          <DataField
            label="Status do Cadastro"
            value={
              <StatusBadge
                variant={
                  cliente.status === 'active'
                    ? 'success'
                    : cliente.status === 'blocked'
                    ? 'danger'
                    : 'neutral'
                }
              >
                {cliente.status === 'active'
                  ? 'Ativo'
                  : cliente.status === 'blocked'
                  ? 'Bloqueado'
                  : cliente.status === 'cancelled'
                  ? 'Cancelado'
                  : 'Inativo'}
              </StatusBadge>
            }
          />
          <DataField label="Criado em" value={formatDate(cliente.createdAt)} />
          <DataField label="Última Atualização" value={formatDate(cliente.updatedAt)} />
        </div>
      </SectionCard>

      {/* Contatos */}
      <SectionCard
        title="Contatos e Comunicação"
        subtitle="Canais diretos para atendimento e notificações"
        icon={<LuPhone className="size-5" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Telefone Principal</span>
            {cliente.phone ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatPhone(cliente.phone)}
                </span>
                <a
                  href={`https://wa.me/55${cliente.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            ) : (
              <span className="text-sm text-muted">-</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">E-mail</span>
            {cliente.email ? (
              <a
                href={`mailto:${cliente.email}`}
                className="text-sm text-accent hover:underline break-all"
              >
                {cliente.email}
              </a>
            ) : (
              <span className="text-sm text-muted">-</span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Endereço e Geolocalização com Mapa */}
      <div className="lg:col-span-2">
        <SectionCard
          title="Endereço de Instalação e Mapa"
          subtitle="Logradouro, bairro, CEP e posicionamento georreferenciado"
          icon={<LuMapPin className="size-5" />}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
              <DataField label="Logradouro" value={address?.street} />
              <DataField label="Número" value={address?.number || 'S/N'} />
              <DataField label="Bairro" value={address?.neighborhood} />
              <DataField label="Cidade / UF" value={address?.city ? `${address.city} / ${address.state ?? ''}` : '-'} />
              <DataField label="CEP" value={formatCep(address?.zipCode)} mono />
              <DataField
                label="Coordenadas"
                value={
                  address?.location
                    ? `${address.location.latitude.toFixed(5)}, ${address.location.longitude.toFixed(5)}`
                    : '-'
                }
                mono
              />
            </div>

            <div className="lg:col-span-7">
              <ClienteMapCard
                location={address?.location}
                addressLabel={addressFormatted}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Equipamentos em Comodato (se existirem) */}
      {comodatos.length > 0 ? (
        <div className="lg:col-span-2">
          <SectionCard
            title="Equipamentos em Comodato"
            subtitle="Equipamentos sob responsabilidade do assinante"
            icon={<LuBox className="size-5" />}
          >
            <div className="divide-y divide-border/60">
              {comodatos.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between py-3">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {item.productDescription || 'Equipamento'}
                    </span>
                    <div className="text-xs text-muted font-mono">ID ERP: {item.idErp}</div>
                  </div>
                  <StatusBadge variant={item.status === 'E' ? 'success' : 'neutral'}>
                    {item.status === 'E' ? 'Entregue' : item.status === 'D' ? 'Devolvido' : item.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
};
