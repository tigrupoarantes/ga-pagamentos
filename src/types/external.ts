export interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface ExternalEmployee {
  id: string;
  company_id?: string;
  nome?: string;
  name?: string;
  cpf?: string;
  email?: string | null;
  cargo?: string | null;
  position?: string | null;
  is_vendedor?: boolean;
  codigo_vendedor?: string | null;
  ativo?: boolean;
  active?: boolean;
  synced_at?: string | null;
  created_at?: string;
  company?: Company;
  [key: string]: unknown;
}

export interface EmployeeFilters {
  company_id?: string;
  is_vendedor?: boolean;
  ativo?: boolean;
  search?: string;
}

// Formatting utilities
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatSyncDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
