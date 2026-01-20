export type AppRole = 'admin' | 'gestor_centro_custo' | 'aprovador' | 'visualizador';

export type StatusSolicitacao = 'rascunho' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada' | 'paga' | 'cancelada';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nome: string; email: string; departamento: string | null; created_at: string; updated_at: string; };
        Insert: { id: string; nome: string; email: string; departamento?: string | null; };
        Update: { nome?: string; email?: string; departamento?: string | null; };
      };
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole; created_at: string; };
        Insert: { id?: string; user_id: string; role: AppRole; };
        Update: { role?: AppRole; };
      };
      centros_custo: {
        Row: { id: string; codigo: string; nome: string; gestor_id: string | null; ativo: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; codigo: string; nome: string; gestor_id?: string | null; ativo?: boolean; };
        Update: { codigo?: string; nome?: string; gestor_id?: string | null; ativo?: boolean; };
      };
      fornecedores: {
        Row: { id: string; cnpj: string; razao_social: string; nome_fantasia: string | null; banco: string | null; agencia: string | null; conta: string | null; tipo_conta: string | null; pix: string | null; ativo: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; cnpj: string; razao_social: string; nome_fantasia?: string | null; banco?: string | null; agencia?: string | null; conta?: string | null; tipo_conta?: string | null; pix?: string | null; ativo?: boolean; };
        Update: { cnpj?: string; razao_social?: string; nome_fantasia?: string | null; banco?: string | null; agencia?: string | null; conta?: string | null; tipo_conta?: string | null; pix?: string | null; ativo?: boolean; };
      };
      orcamento_anual: {
        Row: { id: string; centro_custo_id: string; ano: number; valor_total: number; valor_utilizado: number; created_at: string; updated_at: string; };
        Insert: { id?: string; centro_custo_id: string; ano: number; valor_total: number; valor_utilizado?: number; };
        Update: { centro_custo_id?: string; ano?: number; valor_total?: number; valor_utilizado?: number; };
      };
      solicitacoes_pagamento: {
        Row: { id: string; numero: string; centro_custo_id: string; fornecedor_id: string; solicitante_id: string; descricao: string; valor: number; data_vencimento: string; status: StatusSolicitacao; aprovador_id: string | null; data_aprovacao: string | null; observacoes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; numero?: string; centro_custo_id: string; fornecedor_id: string; solicitante_id: string; descricao: string; valor: number; data_vencimento: string; status?: StatusSolicitacao; };
        Update: { status?: StatusSolicitacao; aprovador_id?: string | null; data_aprovacao?: string | null; observacoes?: string | null; };
      };
    };
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean; };
    };
  };
}
