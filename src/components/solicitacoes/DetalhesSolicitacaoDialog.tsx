import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  FileText,
  Image,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  User,
  DollarSign,
  Hash,
  Clock,
  MessageSquare,
} from 'lucide-react';
import type { StatusSolicitacao } from '@/types/database';

interface Anexo {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  url_publica: string;
  created_at: string;
}

interface SolicitacaoCompleta {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  observacoes: string | null;
  data_aprovacao: string | null;
  centro_custo: { codigo: string; nome: string } | null;
  fornecedor: { razao_social: string; cnpj: string } | null;
  solicitante: { nome: string; email: string } | null;
  aprovador: { nome: string; email: string } | null;
}

interface DetalhesSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string | null;
}

const statusConfig: Record<StatusSolicitacao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'outline' },
  pendente_gestor: { label: 'Aguardando Gestor CC', variant: 'outline' },
  aprovado_gestor: { label: 'Aprovado Gestor', variant: 'secondary' },
  pendente_gerente_financeiro: { label: 'Aguardando Ger. Financeiro', variant: 'outline' },
  aprovado_gerente_financeiro: { label: 'Aprovado Ger. Financeiro', variant: 'secondary' },
  pendente_diretor_financeiro: { label: 'Aguardando Dir. Financeiro', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  paga: { label: 'Paga', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'secondary' },
};

export function DetalhesSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacaoId,
}: DetalhesSolicitacaoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [solicitacao, setSolicitacao] = useState<SolicitacaoCompleta | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  useEffect(() => {
    if (open && solicitacaoId) {
      fetchDetalhes();
    }
  }, [open, solicitacaoId]);

  const fetchDetalhes = async () => {
    if (!solicitacaoId) return;

    setLoading(true);
    try {
      // Buscar solicitação com joins
      const { data: solData, error: solError } = await (supabase
        .from('solicitacoes_pagamento') as any)
        .select(`
          id, numero, descricao, valor, data_vencimento, status, 
          created_at, observacoes, data_aprovacao,
          centros_custo(codigo, nome),
          fornecedores(razao_social, cnpj),
          solicitante:profiles!solicitacoes_pagamento_solicitante_id_fkey(nome, email),
          aprovador:profiles!solicitacoes_pagamento_aprovador_id_fkey(nome, email)
        `)
        .eq('id', solicitacaoId)
        .single();

      if (solError) throw solError;
      if (!solData) throw new Error('Solicitação não encontrada');

      setSolicitacao({
        id: solData.id,
        numero: solData.numero,
        descricao: solData.descricao,
        valor: solData.valor,
        data_vencimento: solData.data_vencimento,
        status: solData.status,
        created_at: solData.created_at,
        observacoes: solData.observacoes,
        data_aprovacao: solData.data_aprovacao,
        centro_custo: solData.centros_custo,
        fornecedor: solData.fornecedores,
        solicitante: solData.solicitante,
        aprovador: solData.aprovador,
      } as SolicitacaoCompleta);

      // Buscar anexos
      const { data: anexosData, error: anexosError } = await (supabase
        .from('anexos_solicitacao') as any)
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: false });

      if (!anexosError) {
        setAnexos(anexosData || []);
      }
    } catch (error) {
      console.error('Error fetching detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) {
      return <Image className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-destructive" />;
  };

  const formatCNPJorCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Solicitação</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : solicitacao ? (
          <div className="space-y-6">
            {/* Header com número e status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-lg font-semibold">{solicitacao.numero}</span>
              </div>
              <Badge variant={statusConfig[solicitacao.status].variant} className="text-sm px-3 py-1">
                {statusConfig[solicitacao.status].label}
              </Badge>
            </div>

            <Separator />

            {/* Informações principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-semibold text-lg">{formatCurrency(solicitacao.valor)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">{formatDate(solicitacao.data_vencimento)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Centro de Custo</p>
                    <p className="font-medium">
                      {solicitacao.centro_custo?.codigo} - {solicitacao.centro_custo?.nome}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{solicitacao.fornecedor?.razao_social}</p>
                    <p className="text-sm text-muted-foreground">
                      {solicitacao.fornecedor?.cnpj && formatCNPJorCPF(solicitacao.fornecedor.cnpj)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{solicitacao.solicitante?.nome}</p>
                    <p className="text-sm text-muted-foreground">{solicitacao.solicitante?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Criada em</p>
                    <p className="font-medium">{formatDateTime(solicitacao.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Descrição */}
            <div>
              <h4 className="font-medium mb-2">Descrição</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {solicitacao.descricao}
              </p>
            </div>

            {/* Observações */}
            {solicitacao.observacoes && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Observações</h4>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {solicitacao.observacoes}
                </p>
              </div>
            )}

            {/* Informações de aprovação */}
            {solicitacao.aprovador && solicitacao.data_aprovacao && (
              <>
                <Separator />
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {solicitacao.status === 'aprovada' ? 'Aprovada por' : 'Rejeitada por'}
                  </h4>
                  <p className="font-medium">{solicitacao.aprovador.nome}</p>
                  <p className="text-sm text-muted-foreground">{solicitacao.aprovador.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Em {formatDateTime(solicitacao.data_aprovacao)}
                  </p>
                </div>
              </>
            )}

            {/* Anexos */}
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Anexos ({anexos.length})</h4>
              {anexos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Nenhum anexo
                </p>
              ) : (
                <div className="space-y-2">
                  {anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      {getFileIcon(anexo.tipo_arquivo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{anexo.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(anexo.tamanho_bytes)} • {formatDateTime(anexo.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(anexo.url_publica, '_blank')}
                          title="Visualizar"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title="Download"
                        >
                          <a href={anexo.url_publica} download={anexo.nome_arquivo}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Solicitação não encontrada
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
