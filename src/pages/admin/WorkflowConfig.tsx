import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowConfig } from '@/hooks/useWorkflowConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Settings, ArrowRight, CheckCircle } from 'lucide-react';

export default function WorkflowConfig() {
  const { config, loading, updateConfig, refetch } = useWorkflowConfig();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [limiteDiretor, setLimiteDiretor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const limite = config.find(c => c.chave === 'limite_diretor_financeiro');
    if (limite) {
      setLimiteDiretor(limite.valor);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig('limite_diretor_financeiro', limiteDiretor);
      toast({
        title: 'Configuração salva',
        description: 'O limite foi atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (!isAdmin()) {
    return (
      <AppLayout title="Configuração do Workflow">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configuração do Workflow">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Configure os parâmetros do fluxo de aprovação de pagamentos
          </p>
        </div>

        {/* Workflow Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Fluxo de Aprovação
            </CardTitle>
            <CardDescription>
              Visualização do processo de aprovação em múltiplos níveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 py-4">
              {/* Nível 1 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 bg-blue-50 border-2 border-blue-200 rounded-lg flex flex-col items-center justify-center p-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-xs font-medium text-center">Gestor do Centro de Custo</span>
                </div>
                <span className="text-xs text-muted-foreground">Sempre</span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Nível 2 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 bg-purple-50 border-2 border-purple-200 rounded-lg flex flex-col items-center justify-center p-2">
                  <CheckCircle className="h-5 w-5 text-purple-600 mb-1" />
                  <span className="text-xs font-medium text-center">Gerente Financeiro</span>
                </div>
                <span className="text-xs text-muted-foreground">Sempre</span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Nível 3 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 bg-amber-50 border-2 border-amber-200 rounded-lg flex flex-col items-center justify-center p-2">
                  <CheckCircle className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="text-xs font-medium text-center">Diretor Financeiro</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Valor ≥ {formatCurrency(limiteDiretor || '50000')}
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Final */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 bg-green-50 border-2 border-green-200 rounded-lg flex flex-col items-center justify-center p-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
                  <span className="text-xs font-medium text-center">Aprovada</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuração do Limite */}
        <Card>
          <CardHeader>
            <CardTitle>Limite para Diretor Financeiro</CardTitle>
            <CardDescription>
              Defina o valor a partir do qual a aprovação do Diretor Financeiro é obrigatória
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="limite">Valor limite (R$)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="limite"
                  type="number"
                  value={limiteDiretor}
                  onChange={(e) => setLimiteDiretor(e.target.value)}
                  placeholder="50000"
                  className="max-w-xs"
                />
                <span className="text-muted-foreground">
                  {formatCurrency(limiteDiretor)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Solicitações com valor igual ou superior a este limite precisarão da aprovação do Diretor Financeiro após o Gerente Financeiro.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </CardContent>
        </Card>

        {/* Descrição dos Níveis */}
        <Card>
          <CardHeader>
            <CardTitle>Níveis de Aprovação</CardTitle>
            <CardDescription>
              Entenda o papel de cada aprovador no fluxo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Gestor do Centro de Custo</h4>
                  <p className="text-sm text-muted-foreground">
                    Primeira aprovação obrigatória. O gestor vinculado ao centro de custo da solicitação deve aprovar.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Gerente Financeiro</h4>
                  <p className="text-sm text-muted-foreground">
                    Segunda aprovação obrigatória. Valida aspectos financeiros e orçamentários da solicitação.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Diretor Financeiro</h4>
                  <p className="text-sm text-muted-foreground">
                    Aprovação final para valores acima do limite configurado. Última instância de aprovação.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
