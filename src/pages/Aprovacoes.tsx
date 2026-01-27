import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { DetalhesSolicitacaoDialog } from '@/components/aprovacoes/DetalhesSolicitacaoDialog';
import { AcaoAprovacaoDialog } from '@/components/aprovacoes/AcaoAprovacaoDialog';
import { StatusSolicitacao } from '@/types/database';
import { EtapaAtual } from '@/types/workflow';

interface SolicitacaoBase {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  centro_custo_id: string;
}

interface Solicitacao extends SolicitacaoBase {
  empresa_id?: string | null;
  centro_custo: { codigo: string; nome: string } | null;
  fornecedor: { razao_social: string; cnpj: string } | null;
  solicitante: { nome: string; email: string } | null;
  etapaAtual?: EtapaAtual | null;
}

export default function Aprovacoes() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [acaoTipo, setAcaoTipo] = useState<'aprovar' | 'rejeitar'>('aprovar');
  const { toast } = useToast();
  const { user, hasRole, isAdmin } = useAuth();
  const { getEtapaAtual } = useWorkflow();

  const canApprove = hasRole('admin') || hasRole('aprovador') || hasRole('gestor_centro_custo') || hasRole('gerente_financeiro') || hasRole('diretor_financeiro');

  const fetchSolicitacoes = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('solicitacoes_pagamento')
        .select(`
          id,
          numero,
          descricao,
          valor,
          data_vencimento,
          status,
          created_at,
          centro_custo_id
        `)
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setSolicitacoes([]);
        return;
      }

      // Type assertion for data
      const solicitacoesData = data as SolicitacaoBase[];

      // Fetch related data
      const centroIds = [...new Set(solicitacoesData.map(s => s.centro_custo_id))];
      const solicitacaoIds = solicitacoesData.map(s => s.id);
      
      const { data: fornecedoresData } = await (supabase as any)
        .from('solicitacoes_pagamento')
        .select('id, fornecedor_id')
        .in('id', solicitacaoIds);
      
      const fornecedorIds = [...new Set((fornecedoresData || []).map((s: { fornecedor_id: string }) => s.fornecedor_id).filter(Boolean))];

      const { data: solicitantesData } = await (supabase as any)
        .from('solicitacoes_pagamento')
        .select('id, solicitante_id')
        .in('id', solicitacaoIds);
      
      const solicitanteIds = [...new Set((solicitantesData || []).map((s: { solicitante_id: string }) => s.solicitante_id).filter(Boolean))];

      const [centrosRes, fornecedoresRes, profilesRes] = await Promise.all([
        supabase.from('centros_custo').select('id, codigo, nome, gestor_id').in('id', centroIds),
        fornecedorIds.length > 0 
          ? supabase.from('fornecedores').select('id, razao_social, cnpj').in('id', fornecedorIds)
          : Promise.resolve({ data: [] }),
        solicitanteIds.length > 0 
          ? supabase.from('profiles').select('id, nome, email').in('id', solicitanteIds)
          : Promise.resolve({ data: [] }),
      ]);

      const centrosMap = new Map((centrosRes.data || []).map(c => [c.id, c]));
      const fornecedoresMap = new Map((fornecedoresRes.data || []).map((f: any) => [f.id, f]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

      const fornecedorIdMap = new Map((fornecedoresData || []).map((s: { id: string; fornecedor_id: string }) => [s.id, s.fornecedor_id]));
      const solicitanteIdMap = new Map((solicitantesData || []).map((s: { id: string; solicitante_id: string }) => [s.id, s.solicitante_id]));

      // Mapear solicitações com dados relacionados
      const solicitacoesComDados: Solicitacao[] = solicitacoesData.map((item) => ({
        ...item,
        centro_custo: centrosMap.get(item.centro_custo_id) || null,
        fornecedor: fornecedoresMap.get(fornecedorIdMap.get(item.id)) || null,
        solicitante: profilesMap.get(solicitanteIdMap.get(item.id)) || null,
      }));

      // Verificar etapa atual e permissão para cada solicitação
      const solicitacoesComEtapa = await Promise.all(
        solicitacoesComDados.map(async (sol) => {
          const etapaAtual = await getEtapaAtual(
            sol.id,
            sol.centro_custo_id,
            null, // empresa_id - não disponível no select básico
            sol.valor
          );
          return { ...sol, etapaAtual };
        })
      );

      // Filtrar apenas solicitações que o usuário pode aprovar
      const solicitacoesFiltradas = isAdmin()
        ? solicitacoesComEtapa // Admin vê tudo
        : solicitacoesComEtapa.filter(sol => {
            // Se não há workflow ou etapa atual, qualquer aprovador pode aprovar
            if (!sol.etapaAtual) return true;
            return sol.etapaAtual.podeAprovar;
          });

      setSolicitacoes(solicitacoesFiltradas);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar solicitações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, getEtapaAtual, isAdmin, toast]);

  useEffect(() => {
    if (user) {
      fetchSolicitacoes();
    }
  }, [user, fetchSolicitacoes]);

  const handleViewDetails = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao);
    setDetalhesOpen(true);
  };

  const handleAprovar = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao);
    setAcaoTipo('aprovar');
    setAcaoOpen(true);
  };

  const handleRejeitar = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao);
    setAcaoTipo('rejeitar');
    setAcaoOpen(true);
  };

  const handleAcaoSuccess = () => {
    fetchSolicitacoes();
    setAcaoOpen(false);
    setSelectedSolicitacao(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!canApprove) {
    return (
      <AppLayout title="Aprovações">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Aprovações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Gerencie as solicitações de pagamento pendentes de aprovação
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {solicitacoes.length} pendente{solicitacoes.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Etapa Atual</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : solicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Nenhuma solicitação pendente de aprovação para você
                  </TableCell>
                </TableRow>
              ) : (
                solicitacoes.map((solicitacao) => (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">
                      {solicitacao.numero}
                    </TableCell>
                    <TableCell>
                      {solicitacao.solicitante?.nome || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {solicitacao.descricao}
                    </TableCell>
                    <TableCell>
                      {solicitacao.fornecedor?.razao_social || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {solicitacao.centro_custo?.nome || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {solicitacao.etapaAtual ? (
                        <Badge variant="outline" className="whitespace-nowrap">
                          {solicitacao.etapaAtual.numero}/{solicitacao.etapaAtual.total}: {solicitacao.etapaAtual.etapa.nome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(solicitacao.valor)}</TableCell>
                    <TableCell>{formatDate(solicitacao.data_vencimento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(solicitacao)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => handleAprovar(solicitacao)}
                          title="Aprovar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          onClick={() => handleRejeitar(solicitacao)}
                          title="Rejeitar"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DetalhesSolicitacaoDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        solicitacao={selectedSolicitacao}
      />

      <AcaoAprovacaoDialog
        open={acaoOpen}
        onOpenChange={setAcaoOpen}
        solicitacao={selectedSolicitacao}
        tipo={acaoTipo}
        onSuccess={handleAcaoSuccess}
      />
    </AppLayout>
  );
}
