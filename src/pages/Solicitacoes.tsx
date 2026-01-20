import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Eye, Loader2, Send } from 'lucide-react';
import type { StatusSolicitacao } from '@/types/database';
import { NovaSolicitacaoDialog } from '@/components/solicitacoes/NovaSolicitacaoDialog';
import { useAuth } from '@/contexts/AuthContext';

interface Solicitacao {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusSolicitacao;
  created_at: string;
  centros_custo?: { codigo: string; nome: string };
  fornecedores?: { razao_social: string };
}

const statusLabels: Record<StatusSolicitacao, string> = {
  rascunho: 'Rascunho',
  pendente_aprovacao: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

const statusVariants: Record<StatusSolicitacao, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'secondary',
  pendente_aprovacao: 'outline',
  aprovada: 'default',
  rejeitada: 'destructive',
  paga: 'default',
  cancelada: 'secondary',
};

export default function Solicitacoes() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_pagamento')
        .select('*, centros_custo(codigo, nome), fornecedores(razao_social)')
        .order('created_at', { ascending: false }) as { data: Solicitacao[] | null; error: any };

      if (error) throw error;
      setSolicitacoes(data || []);
    } catch (error) {
      console.error('Error fetching solicitacoes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar solicitações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    setSubmittingId(id);
    try {
      const { error } = await (supabase.from('solicitacoes_pagamento') as any)
        .update({ status: 'pendente_aprovacao' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Solicitação enviada para aprovação',
      });
      
      fetchSolicitacoes();
    } catch (error: any) {
      console.error('Error submitting solicitacao:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar solicitação',
        variant: 'destructive',
      });
    } finally {
      setSubmittingId(null);
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

  return (
    <AppLayout title="Solicitações de Pagamento">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Visualize e gerencie suas solicitações de pagamento
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : solicitacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação encontrada
                </TableCell>
              </TableRow>
            ) : (
              solicitacoes.map((solicitacao) => (
                <TableRow key={solicitacao.id}>
                  <TableCell className="font-mono text-sm">{solicitacao.numero}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{solicitacao.descricao}</TableCell>
                  <TableCell>{solicitacao.fornecedores?.razao_social || '-'}</TableCell>
                  <TableCell>
                    {solicitacao.centros_custo?.codigo} - {solicitacao.centros_custo?.nome}
                  </TableCell>
                  <TableCell>{formatCurrency(solicitacao.valor)}</TableCell>
                  <TableCell>{formatDate(solicitacao.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[solicitacao.status]}>
                      {statusLabels[solicitacao.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {solicitacao.status === 'rascunho' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enviar para aprovação"
                          onClick={() => handleSubmitForApproval(solicitacao.id)}
                          disabled={submittingId === solicitacao.id}
                        >
                          {submittingId === solicitacao.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NovaSolicitacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchSolicitacoes}
      />
    </AppLayout>
  );
}
