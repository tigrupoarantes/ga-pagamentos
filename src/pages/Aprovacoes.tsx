import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { DetalhesSolicitacaoDialog } from '@/components/aprovacoes/DetalhesSolicitacaoDialog';
import { AcaoAprovacaoDialog } from '@/components/aprovacoes/AcaoAprovacaoDialog';
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

export default function Aprovacoes() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [acaoTipo, setAcaoTipo] = useState<'aprovar' | 'rejeitar'>('aprovar');
  const { toast } = useToast();
  const { user, hasRole } = useAuth();

  const canApprove = hasRole('admin') || hasRole('aprovador');

  const fetchSolicitacoes = async () => {
    try {
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
          centro_custo_id,
          fornecedor_id,
          solicitante_id
        `)
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately to avoid relationship errors
      const centroIds = [...new Set((data || []).map(s => s.centro_custo_id))];
      const fornecedorIds = [...new Set((data || []).map(s => s.fornecedor_id))];
      const solicitanteIds = [...new Set((data || []).map(s => s.solicitante_id))];

      const [centrosRes, fornecedoresRes, profilesRes] = await Promise.all([
        supabase.from('centros_custo').select('id, codigo, nome').in('id', centroIds),
        supabase.from('fornecedores').select('id, razao_social, cnpj').in('id', fornecedorIds),
        supabase.from('profiles').select('id, nome, email').in('id', solicitanteIds),
      ]);

      const centrosMap = new Map((centrosRes.data || []).map(c => [c.id, c]));
      const fornecedoresMap = new Map((fornecedoresRes.data || []).map(f => [f.id, f]));
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      const formattedData = (data || []).map((item) => ({
        ...item,
        centro_custo_id: item.centro_custo_id,
        centro_custo: centrosMap.get(item.centro_custo_id) || null,
        fornecedor: fornecedoresMap.get(item.fornecedor_id) || null,
        solicitante: profilesMap.get(item.solicitante_id) || null,
      }));

      setSolicitacoes(formattedData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar solicitações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

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
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : solicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Nenhuma solicitação pendente de aprovação
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
