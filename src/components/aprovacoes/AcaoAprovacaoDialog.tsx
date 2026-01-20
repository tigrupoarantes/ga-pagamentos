import { useState } from 'react';
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
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { StatusSolicitacao } from '@/types/database';

interface Solicitacao {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  centro_custo: { codigo: string; nome: string } | null;
  fornecedor: { razao_social: string; cnpj: string } | null;
  solicitante: { nome: string; email: string } | null;
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
  const { toast } = useToast();
  const { user } = useAuth();

  const isAprovacao = tipo === 'aprovar';

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

    setLoading(true);

    try {
      const novoStatus = isAprovacao ? 'aprovada' : 'rejeitada';

      // Using rpc-style update to bypass strict typing
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
      <DialogContent>
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
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
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
