import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowEtapa, WorkflowAprovador, WorkflowContexto, EtapaAtual } from '@/types/workflow';
import { useAuth } from '@/contexts/AuthContext';

export function useWorkflow() {
  const [loading, setLoading] = useState(false);
  const [etapas, setEtapas] = useState<WorkflowEtapa[]>([]);
  const { user, roles } = useAuth();

  // Buscar etapas de um workflow específico
  const fetchEtapas = useCallback(async (contexto: WorkflowContexto) => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('workflow_etapas')
        .select(`
          *,
          aprovadores:workflow_aprovadores(
            id,
            etapa_id,
            usuario_id,
            role,
            created_at
          )
        `)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (contexto.tipo === 'centro_custo' && contexto.centroCustoId) {
        query = query.eq('centro_custo_id', contexto.centroCustoId);
      } else if (contexto.tipo === 'empresa' && contexto.empresaId) {
        query = query.eq('empresa_id', contexto.empresaId).is('centro_custo_id', null);
      } else {
        query = query.is('empresa_id', null).is('centro_custo_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEtapas(data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar workflow aplicável para uma solicitação
  const getWorkflowParaSolicitacao = useCallback(async (
    centroCustoId: string,
    empresaId: string | null,
    valor: number
  ): Promise<WorkflowEtapa[]> => {
    try {
      // 1. Tentar buscar workflow específico do centro de custo
      let query = (supabase as any)
        .from('workflow_etapas')
        .select(`
          *,
          aprovadores:workflow_aprovadores(*)
        `)
        .eq('centro_custo_id', centroCustoId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      let { data, error } = await query;
      if (error) throw error;

      // 2. Se não encontrou, buscar workflow da empresa
      if (!data || data.length === 0) {
        if (empresaId) {
          const { data: empresaData, error: empresaError } = await (supabase as any)
            .from('workflow_etapas')
            .select(`
              *,
              aprovadores:workflow_aprovadores(*)
            `)
            .eq('empresa_id', empresaId)
            .is('centro_custo_id', null)
            .eq('ativo', true)
            .order('ordem', { ascending: true });

          if (empresaError) throw empresaError;
          data = empresaData;
        }
      }

      // 3. Se ainda não encontrou, buscar workflow padrão
      if (!data || data.length === 0) {
        const { data: defaultData, error: defaultError } = await (supabase as any)
          .from('workflow_etapas')
          .select(`
            *,
            aprovadores:workflow_aprovadores(*)
          `)
          .is('empresa_id', null)
          .is('centro_custo_id', null)
          .eq('ativo', true)
          .order('ordem', { ascending: true });

        if (defaultError) throw defaultError;
        data = defaultData;
      }

      // 4. Filtrar por faixas de valor
      const etapasFiltradas = (data || []).filter((etapa: WorkflowEtapa) => {
        const dentroMinimo = etapa.valor_minimo === null || valor >= etapa.valor_minimo;
        const dentroMaximo = etapa.valor_maximo === null || valor <= etapa.valor_maximo;
        return dentroMinimo && dentroMaximo;
      });

      return etapasFiltradas;
    } catch (error) {
      console.error('Erro ao buscar workflow para solicitação:', error);
      return [];
    }
  }, []);

  // Obter a etapa atual de uma solicitação
  const getEtapaAtual = useCallback(async (
    solicitacaoId: string,
    centroCustoId: string,
    empresaId: string | null,
    valor: number
  ): Promise<EtapaAtual | null> => {
    if (!user) return null;

    try {
      // Buscar histórico de aprovações
      const { data: historico, error: histError } = await (supabase as any)
        .from('aprovacoes_historico')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .eq('acao', 'aprovado')
        .order('created_at', { ascending: true });

      if (histError) throw histError;

      // Buscar workflow aplicável
      const workflowEtapas = await getWorkflowParaSolicitacao(centroCustoId, empresaId, valor);
      if (workflowEtapas.length === 0) return null;

      // Encontrar a próxima etapa não aprovada
      const etapasAprovadas = new Set((historico || []).map((h: any) => h.etapa_id));
      const proximaEtapa = workflowEtapas.find(e => !etapasAprovadas.has(e.id));

      if (!proximaEtapa) return null;

      // Verificar se o usuário pode aprovar esta etapa
      const podeAprovar = await verificarSeUsuarioPodeAprovar(
        user.id,
        roles,
        proximaEtapa,
        centroCustoId
      );

      return {
        etapa: proximaEtapa,
        numero: workflowEtapas.indexOf(proximaEtapa) + 1,
        total: workflowEtapas.length,
        podeAprovar,
      };
    } catch (error) {
      console.error('Erro ao obter etapa atual:', error);
      return null;
    }
  }, [user, roles, getWorkflowParaSolicitacao]);

  // Verificar se usuário pode aprovar uma etapa
  const verificarSeUsuarioPodeAprovar = async (
    userId: string,
    userRoles: string[],
    etapa: WorkflowEtapa,
    centroCustoId: string
  ): Promise<boolean> => {
    const aprovadores = etapa.aprovadores || [];

    // Verificar por usuário específico
    if (aprovadores.some(a => a.usuario_id === userId)) {
      return true;
    }

    // Verificar por role
    if (aprovadores.some(a => a.role && userRoles.includes(a.role))) {
      return true;
    }

    // Verificar se é gestor do centro de custo
    if (etapa.tipo === 'gestor_cc') {
      const { data: cc } = await (supabase as any)
        .from('centros_custo')
        .select('gestor_id')
        .eq('id', centroCustoId)
        .single();

      if (cc?.gestor_id === userId) {
        return true;
      }
    }

    // Admin sempre pode aprovar
    if (userRoles.includes('admin')) {
      return true;
    }

    return false;
  };

  // Criar nova etapa
  const criarEtapa = useCallback(async (
    etapa: Omit<WorkflowEtapa, 'id' | 'created_at' | 'aprovadores'>
  ): Promise<WorkflowEtapa | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('workflow_etapas')
        .insert(etapa)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      return null;
    }
  }, []);

  // Atualizar etapa
  const atualizarEtapa = useCallback(async (
    id: string,
    updates: Partial<WorkflowEtapa>
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('workflow_etapas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      return false;
    }
  }, []);

  // Excluir etapa
  const excluirEtapa = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('workflow_etapas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      return false;
    }
  }, []);

  // Reordenar etapas
  const reordenarEtapas = useCallback(async (
    etapasReordenadas: { id: string; ordem: number }[]
  ): Promise<boolean> => {
    try {
      // Atualizar cada etapa individualmente
      for (const { id, ordem } of etapasReordenadas) {
        const { error } = await (supabase as any)
          .from('workflow_etapas')
          .update({ ordem })
          .eq('id', id);

        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Erro ao reordenar etapas:', error);
      return false;
    }
  }, []);

  // Adicionar aprovador a uma etapa
  const adicionarAprovador = useCallback(async (
    etapaId: string,
    aprovador: { usuario_id?: string; role?: string }
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('workflow_aprovadores')
        .insert({
          etapa_id: etapaId,
          usuario_id: aprovador.usuario_id || null,
          role: aprovador.role || null,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao adicionar aprovador:', error);
      return false;
    }
  }, []);

  // Remover aprovador
  const removerAprovador = useCallback(async (aprovadorId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('workflow_aprovadores')
        .delete()
        .eq('id', aprovadorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao remover aprovador:', error);
      return false;
    }
  }, []);

  // Registrar aprovação/rejeição no histórico
  const registrarAprovacao = useCallback(async (
    solicitacaoId: string,
    etapaId: string,
    aprovadorId: string,
    acao: 'aprovado' | 'rejeitado',
    observacoes?: string,
    nivel?: number
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('aprovacoes_historico')
        .insert({
          solicitacao_id: solicitacaoId,
          etapa_id: etapaId,
          aprovador_id: aprovadorId,
          acao,
          observacoes: observacoes || null,
          nivel: nivel || 1,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao registrar aprovação:', error);
      return false;
    }
  }, []);

  return {
    loading,
    etapas,
    fetchEtapas,
    getWorkflowParaSolicitacao,
    getEtapaAtual,
    criarEtapa,
    atualizarEtapa,
    excluirEtapa,
    reordenarEtapas,
    adicionarAprovador,
    removerAprovador,
    registrarAprovacao,
  };
}
