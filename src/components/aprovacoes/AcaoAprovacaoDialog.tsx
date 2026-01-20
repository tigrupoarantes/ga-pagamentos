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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { StatusSolicitacao } from '@/types/database';

interface Solicitacao {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  centro_custo_id: string;
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
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const isAprovacao = tipo === 'aprovar';

  // Buscar orçamento quando o dialog abrir para aprovação
  useEffect(() => {
    if (open && solicitacao && isAprovacao) {
      fetchOrcamento(solicitacao.centro_custo_id);
    } else {
      setOrcamento(null);
    }
  }, [open, solicitacao, isAprovacao]);

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

    setLoading(true);

    try {
      const novoStatus = isAprovacao ? 'aprovada' : 'rejeitada';

      // Atualizar a solicitação
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

      // Se aprovação, atualizar o valor utilizado do orçamento
      if (isAprovacao && orcamento) {
        const novoValorUtilizado = orcamento.valor_utilizado + solicitacao.valor;
        const { error: orcamentoError } = await (supabase as any)
          .from('orcamento_anual')
          .update({ valor_utilizado: novoValorUtilizado })
          .eq('id', orcamento.id);

        if (orcamentoError) {
          console.error('Erro ao atualizar orçamento:', orcamentoError);
          // Não falhar a aprovação por causa disso, apenas logar
        }
      }

      toast({
        title: isAprovacao ? 'Solicitação aprovada' : 'Solicitação rejeitada',
        description: `A solicitação ${solicitacao.numero} foi ${isAprovacao ? 'aprovada' : 'rejeitada'} com sucesso.`,
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
            disabled={loading || loadingOrcamento || (isAprovacao && !temSaldoSuficiente && !isAdmin())}
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
