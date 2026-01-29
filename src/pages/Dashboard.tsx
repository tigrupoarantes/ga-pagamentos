import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalSolicitacoes: number;
  pendentes: number;
  aprovadas: number;
  valorTotal: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSolicitacoes: 0,
    pendentes: 0,
    aprovadas: 0,
    valorTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: solicitacoes, error } = await supabase
        .from('solicitacoes_pagamento')
        .select('status, valor') as { data: { status: string; valor: number }[] | null; error: any };

      if (error) throw error;

      const statsData = (solicitacoes || []).reduce(
        (acc, sol) => ({
          totalSolicitacoes: acc.totalSolicitacoes + 1,
          pendentes: acc.pendentes + (sol.status === 'pendente_aprovacao' ? 1 : 0),
          aprovadas: acc.aprovadas + (sol.status === 'aprovada' || sol.status === 'paga' ? 1 : 0),
          valorTotal: acc.valorTotal + (sol.valor || 0),
        }),
        { totalSolicitacoes: 0, pendentes: 0, aprovadas: 0, valorTotal: 0 }
      );

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const cards = [
    {
      title: 'Total de Solicitações',
      value: stats.totalSolicitacoes,
      description: 'Todas as solicitações',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pendentes',
      value: stats.pendentes,
      description: 'Aguardando aprovação',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Aprovadas',
      value: stats.aprovadas,
      description: 'Aprovadas ou pagas',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Valor Total',
      value: formatCurrency(stats.valorTotal),
      description: 'Soma de todas solicitações',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card 
            key={card.title} 
            className={`card-hover animate-fade-in-up animate-stagger-${index + 1}`}
            style={{ animationFillMode: 'backwards' }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
          <CardHeader>
            <CardTitle>Bem-vindo ao GA Pagamentos</CardTitle>
            <CardDescription>
              Sistema de Gestão de Solicitações de Pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Utilize o menu lateral para navegar entre as funcionalidades do sistema.
              Você pode criar novas solicitações de pagamento, acompanhar o status das suas
              solicitações e, se for administrador, gerenciar centros de custo, fornecedores
              e orçamentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
