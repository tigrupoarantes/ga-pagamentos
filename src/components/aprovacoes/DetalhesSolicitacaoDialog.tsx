import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

interface DetalhesSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: Solicitacao | null;
}

export function DetalhesSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacao,
}: DetalhesSolicitacaoDialogProps) {
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

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Solicitação {solicitacao.numero}
            <Badge variant="secondary">Pendente de Aprovação</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium">
                  {solicitacao.fornecedor?.cnpj
                    ? formatCNPJ(solicitacao.fornecedor.cnpj)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{solicitacao.fornecedor?.razao_social || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
