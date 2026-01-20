import { AppRole } from './database';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  created_at: string;
}

export type TipoEtapa = 'role' | 'usuario' | 'gestor_cc';

export interface WorkflowEtapa {
  id: string;
  empresa_id: string | null;
  centro_custo_id: string | null;
  nome: string;
  ordem: number;
  tipo: TipoEtapa;
  valor_minimo: number | null;
  valor_maximo: number | null;
  ativo: boolean;
  created_at: string;
  // Dados relacionados
  aprovadores?: WorkflowAprovador[];
}

export interface WorkflowAprovador {
  id: string;
  etapa_id: string;
  usuario_id: string | null;
  role: AppRole | null;
  created_at: string;
  // Dados relacionados
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface AprovacaoHistorico {
  id: string;
  solicitacao_id: string;
  etapa_id: string | null;
  nivel: number;
  aprovador_id: string;
  acao: 'aprovado' | 'rejeitado';
  observacoes: string | null;
  created_at: string;
  // Dados relacionados
  aprovador?: {
    id: string;
    nome: string;
    email: string;
  };
  etapa?: WorkflowEtapa;
}

export interface WorkflowContexto {
  tipo: 'empresa' | 'centro_custo' | 'padrao';
  empresaId?: string;
  centroCustoId?: string;
}

export interface EtapaAtual {
  etapa: WorkflowEtapa;
  numero: number;
  total: number;
  podeAprovar: boolean;
}

// Tipos para drag-and-drop
export interface DragItem {
  id: string;
  ordem: number;
}

export interface DropResult {
  id: string;
  novaOrdem: number;
}
