import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflow } from '@/hooks/useWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, AlertTriangle, TrendingDown, TrendingUp, Workflow } from 'lucide-react';
import { StatusSolicitacao } from '@/types/database';
import { EtapaAtual, WorkflowEtapa } from '@/types/workflow';

interface Solicitacao {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  centro_custo_id: string;
  empresa_id?: string | null;
  centro_custo: { codigo: string; nome: string } | null;
  fornecedor: { razao_social: string; cnpj: string } | null;
  solicitante: { nome: string; email: string } | null;
}

interface Orcamento {
  id: string;
  valor_total: number;
  valor_utilizado: number;
  ano: number;
}

interface AcaoAprovacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: Solicitacao | null;
  tipo: 'aprovar' | 'rejeitar';
  onSuccess: () => void;
}

export function AcaoAprovacaoDialog({
  open,
  onOpenChange,
  solicitacao,
  tipo,
  onSuccess,
}: AcaoAprovacaoDialogProps) {
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [loadingOrcamento, setLoadingOrcamento] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState<EtapaAtual | null>(null);
  const [loadingEtapa, setLoadingEtapa] = useState(false);
  const [workflowEtapas, setWorkflowEtapas] = useState<WorkflowEtapa[]>([]);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { getEtapaAtual, getWorkflowParaSolicitacao, registrarAprovacao } = useWorkflow();

  const isAprovacao = tipo === 'aprovar';

  // Buscar orçamento e etapa quando o dialog abrir
  useEffect(() => {
    if (open && solicitacao) {
      if (isAprovacao) {
        fetchOrcamento(solicitacao.centro_custo_id);
      } else {
        setOrcamento(null);
      }
      fetchEtapaAtual();
    } else {
      setOrcamento(null);
      setEtapaAtual(null);
      setWorkflowEtapas([]);
    }
  }, [open, solicitacao, isAprovacao]);

  const fetchEtapaAtual = async () => {
    if (!solicitacao) return;

    setLoadingEtapa(true);
    try {
      // Buscar workflow aplicável
      const etapas = await getWorkflowParaSolicitacao(
        solicitacao.centro_custo_id,
        solicitacao.empresa_id || null,
        solicitacao.valor
      );
      setWorkflowEtapas(etapas);

      // Buscar etapa atual
      const etapa = await getEtapaAtual(
        solicitacao.id,
        solicitacao.centro_custo_id,
        solicitacao.empresa_id || null,
        solicitacao.valor
      );
      setEtapaAtual(etapa);
    } catch (error) {
      console.error('Erro ao buscar etapa atual:', error);
    } finally {
      setLoadingEtapa(false);
    }
  };

  const fetchOrcamento = async (centroCustoId: string) => {
    if (!centroCustoId) {
      setOrcamento(null);
      return;
    }

    setLoadingOrcamento(true);
    try {
      const anoAtual = new Date().getFullYear();
      const { data, error } = await supabase
        .from('orcamento_anual')
        .select('id, valor_total, valor_utilizado, ano')
        .eq('centro_custo_id', centroCustoId)
        .eq('ano', anoAtual)
        .maybeSingle();

      if (error) throw error;
      setOrcamento(data);
    } catch (error: any) {
      console.error('Erro ao buscar orçamento:', error);
      setOrcamento(null);
    } finally {
      setLoadingOrcamento(false);
    }
  };

  const saldoDisponivel = orcamento 
    ? orcamento.valor_total - orcamento.valor_utilizado 
    : 0;
  
  const saldoAposAprovacao = orcamento && solicitacao 
    ? saldoDisponivel - solicitacao.valor 
    : 0;
  
  const temSaldoSuficiente = !orcamento || saldoDisponivel >= (solicitacao?.valor || 0);
  const orcamentoNaoEncontrado = isAprovacao && !loadingOrcamento && !orcamento;

  const handleSubmit = async () => {
    if (!solicitacao || !user) return;

    if (!isAprovacao && !observacoes.trim()) {
      toast({
        title: 'Observação obrigatória',
        description: 'Por favor, informe o motivo da rejeição.',
        variant: 'destructive',
      });
      return;
    }

    // Validar saldo para aprovação (apenas admins podem forçar)
    if (isAprovacao && !temSaldoSuficiente && !isAdmin()) {
      toast({
        title: 'Saldo insuficiente',
        description: 'O centro de custo não possui saldo disponível para esta aprovação.',
        variant: 'destructive',
      });
      return;
    }

    // Validar se pode aprovar esta etapa
    if (etapaAtual && !etapaAtual.podeAprovar && !isAdmin()) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para aprovar esta etapa.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Registrar no histórico de aprovações (se tiver etapa configurada)
      if (etapaAtual) {
        const registrou = await registrarAprovacao(
          solicitacao.id,
          etapaAtual.etapa.id,
          user.id,
          isAprovacao ? 'aprovado' : 'rejeitado',
          observacoes.trim() || undefined,
          etapaAtual.numero
        );

        if (!registrou) {
          throw new Error('Falha ao registrar aprovação no histórico');
        }
      }

      // 2. Determinar o novo status
      let novoStatus: StatusSolicitacao;
      
      if (!isAprovacao) {
        novoStatus = 'rejeitada';
      } else if (etapaAtual && etapaAtual.numero < etapaAtual.total) {
        // Ainda há mais etapas
        novoStatus = 'pendente_aprovacao';
      } else {
        // Última etapa ou sem workflow configurado
        novoStatus = 'aprovada';
      }

      // 3. Atualizar a solicitação
      const { error } = await (supabase as any)
        .from('solicitacoes_pagamento')
        .update({
          status: novoStatus,
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
          observacoes: observacoes.trim() || null,
        })
        .eq('id', solicitacao.id);

      if (error) throw error;

      // 4. Se aprovação final, atualizar o valor utilizado do orçamento
      if (novoStatus === 'aprovada' && orcamento) {
        const novoValorUtilizado = orcamento.valor_utilizado + solicitacao.valor;
        const { error: orcamentoError } = await (supabase as any)
          .from('orcamento_anual')
          .update({ valor_utilizado: novoValorUtilizado })
          .eq('id', orcamento.id);

        if (orcamentoError) {
          console.error('Erro ao atualizar orçamento:', orcamentoError);
        }
      }

      const mensagemSucesso = isAprovacao
        ? etapaAtual && etapaAtual.numero < etapaAtual.total
          ? `Etapa "${etapaAtual.etapa.nome}" aprovada. Aguardando próxima etapa.`
          : `A solicitação ${solicitacao.numero} foi aprovada com sucesso.`
        : `A solicitação ${solicitacao.numero} foi rejeitada.`;

      toast({
        title: isAprovacao ? 'Aprovação registrada' : 'Solicitação rejeitada',
        description: mensagemSucesso,
      });

      setObservacoes('');
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao processar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setObservacoes('');
    setOrcamento(null);
    setEtapaAtual(null);
    setWorkflowEtapas([]);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (!solicitacao) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAprovacao ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {isAprovacao ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
          </DialogTitle>
          <DialogDescription>
            {isAprovacao
              ? 'Confirme a aprovação desta solicitação de pagamento.'
              : 'Informe o motivo da rejeição desta solicitação.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da solicitação */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Número:</span>
              <span className="font-medium">{solicitacao.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor:</span>
              <span className="font-medium">{formatCurrency(solicitacao.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fornecedor:</span>
              <span className="font-medium">
                {solicitacao.fornecedor?.razao_social || 'N/A'}
              </span>
            </div>
          </div>

          {/* Informações da Etapa Atual (workflow dinâmico) */}
          {loadingEtapa ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando workflow...</span>
              </div>
            </div>
          ) : etapaAtual ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Workflow className="h-4 w-4" />
                  Etapa do Workflow
                </div>
                <Badge variant="secondary">
                  {etapaAtual.numero} de {etapaAtual.total}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="font-medium">{etapaAtual.etapa.nome}</p>
                {etapaAtual.etapa.tipo === 'gestor_cc' && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Aprovação do Gestor do Centro de Custo
                  </p>
                )}
              </div>
              {!etapaAtual.podeAprovar && !isAdmin() && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Sem permissão</p>
                    <p className="text-muted-foreground text-xs">
                      Você não está configurado como aprovador desta etapa.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : workflowEtapas.length === 0 ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                <Workflow className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Sem workflow configurado</p>
                  <p className="text-muted-foreground text-xs">
                    A aprovação será processada diretamente.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Informações de Orçamento (apenas para aprovação) */}
          {isAprovacao && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Informações de Orçamento
              </div>
              
              {loadingOrcamento ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Carregando orçamento...</span>
                </div>
              ) : orcamentoNaoEncontrado ? (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">
                      Orçamento não encontrado
                    </p>
                    <p className="text-muted-foreground">
                      Não há orçamento cadastrado para este centro de custo em {new Date().getFullYear()}.
                    </p>
                  </div>
                </div>
              ) : orcamento && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Centro de Custo:</span>
                    <span className="font-medium">
                      {solicitacao.centro_custo?.codigo} - {solicitacao.centro_custo?.nome}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orçamento {orcamento.ano}:</span>
                    <span className="font-medium">{formatCurrency(orcamento.valor_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilizado:</span>
                    <span className="font-medium">{formatCurrency(orcamento.valor_utilizado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disponível:</span>
                    <span className={`font-medium ${saldoDisponivel < 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(saldoDisponivel)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Saldo após aprovação:</span>
                      <span className={`font-bold flex items-center gap-1 ${saldoAposAprovacao < 0 ? 'text-destructive' : 'text-primary'}`}>
                        {saldoAposAprovacao < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                        {formatCurrency(saldoAposAprovacao)}
                      </span>
                    </div>
                  </div>

                  {!temSaldoSuficiente && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 mt-3">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-destructive">Saldo insuficiente</p>
                        <p className="text-muted-foreground text-xs">
                          {isAdmin() 
                            ? 'Como administrador, você pode aprovar mesmo sem saldo suficiente.'
                            : 'Não é possível aprovar esta solicitação sem saldo disponível.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">
              Observações {!isAprovacao && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="observacoes"
              placeholder={
                isAprovacao
                  ? 'Adicione uma observação (opcional)...'
                  : 'Informe o motivo da rejeição...'
              }
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading || 
              loadingOrcamento || 
              loadingEtapa ||
              (isAprovacao && !temSaldoSuficiente && !isAdmin()) ||
              (etapaAtual && !etapaAtual.podeAprovar && !isAdmin())
            }
            variant={isAprovacao ? 'default' : 'destructive'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAprovacao ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
