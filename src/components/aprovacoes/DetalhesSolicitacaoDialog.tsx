import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { StatusSolicitacao } from '@/types/database';
import { useWorkflow } from '@/hooks/useWorkflow';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import { WorkflowEtapa, EtapaAtual } from '@/types/workflow';

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

interface DetalhesSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: Solicitacao | null;
}

const statusLabels: Record<StatusSolicitacao, string> = {
  rascunho: 'Rascunho',
  pendente_aprovacao: 'Pendente de Aprovação',
  pendente_gestor: 'Pendente Gestor',
  aprovado_gestor: 'Aprovado pelo Gestor',
  pendente_gerente_financeiro: 'Pendente Gerente Financeiro',
  aprovado_gerente_financeiro: 'Aprovado pelo Gerente Financeiro',
  pendente_diretor_financeiro: 'Pendente Diretor Financeiro',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

export function DetalhesSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacao,
}: DetalhesSolicitacaoDialogProps) {
  const [workflowEtapas, setWorkflowEtapas] = useState<WorkflowEtapa[]>([]);
  const [etapaAtual, setEtapaAtual] = useState<EtapaAtual | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const { getWorkflowParaSolicitacao, getEtapaAtual } = useWorkflow();

  useEffect(() => {
    if (open && solicitacao) {
      fetchWorkflowInfo();
    } else {
      setWorkflowEtapas([]);
      setEtapaAtual(null);
    }
  }, [open, solicitacao]);

  const fetchWorkflowInfo = async () => {
    if (!solicitacao) return;

    setLoadingWorkflow(true);
    try {
      const [etapas, etapa] = await Promise.all([
        getWorkflowParaSolicitacao(
          solicitacao.centro_custo_id,
          solicitacao.empresa_id || null,
          solicitacao.valor
        ),
        getEtapaAtual(
          solicitacao.id,
          solicitacao.centro_custo_id,
          solicitacao.empresa_id || null,
          solicitacao.valor
        ),
      ]);
      setWorkflowEtapas(etapas);
      setEtapaAtual(etapa);
    } catch (error) {
      console.error('Erro ao buscar workflow:', error);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  if (!solicitacao) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDocumento = (documento: string) => {
    const numbers = documento.replace(/\D/g, '');
    if (numbers.length === 11) {
      // CPF
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const getStatusVariant = (status: StatusSolicitacao) => {
    switch (status) {
      case 'aprovada':
      case 'paga':
        return 'default';
      case 'rejeitada':
      case 'cancelada':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Calcular o índice da etapa atual para o progress bar
  const etapaAtualIndex = etapaAtual 
    ? etapaAtual.numero - 1 
    : solicitacao.status === 'aprovada' || solicitacao.status === 'paga'
      ? workflowEtapas.length // Todas aprovadas
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Solicitação {solicitacao.numero}
            <Badge variant={getStatusVariant(solicitacao.status)}>
              {statusLabels[solicitacao.status] || solicitacao.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progresso do Workflow */}
          {loadingWorkflow ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando workflow...</span>
              </div>
            </div>
          ) : workflowEtapas.length > 0 ? (
            <div className="rounded-lg border p-4">
              <WorkflowProgressBar 
                etapas={workflowEtapas} 
                etapaAtualIndex={etapaAtualIndex}
              />
            </div>
          ) : null}

          {/* Informações Gerais */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              Informações Gerais
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-medium">{formatDate(solicitacao.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="font-medium">{formatDate(solicitacao.data_vencimento)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p className="font-medium">{solicitacao.descricao}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium text-lg">{formatCurrency(solicitacao.valor)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Solicitante */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              Solicitante
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{solicitacao.solicitante?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{solicitacao.solicitante?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Centro de Custo */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              Centro de Custo
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{solicitacao.centro_custo?.codigo || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{solicitacao.centro_custo?.nome || 'N/A'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fornecedor */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              Fornecedor
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">
                  {solicitacao.fornecedor?.cnpj
                    ? formatDocumento(solicitacao.fornecedor.cnpj)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                <p className="font-medium">{solicitacao.fornecedor?.razao_social || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
