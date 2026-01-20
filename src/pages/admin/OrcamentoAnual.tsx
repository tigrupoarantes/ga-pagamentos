import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
}

interface Orcamento {
  id: string;
  centro_custo_id: string;
  ano: number;
  valor_total: number;
  valor_utilizado: number;
  centros_custo?: CentroCusto;
}

export default function OrcamentoAnual() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const [formData, setFormData] = useState({
    centro_custo_id: '',
    ano: new Date().getFullYear().toString(),
    valor_total: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orcamentosRes, centrosRes] = await Promise.all([
        supabase
          .from('orcamento_anual')
          .select('*, centros_custo(id, codigo, nome)')
          .order('ano', { ascending: false }),
        supabase
          .from('centros_custo')
          .select('id, codigo, nome')
          .eq('ativo', true)
          .order('codigo'),
      ]);

      if (orcamentosRes.error) throw orcamentosRes.error;
      if (centrosRes.error) throw centrosRes.error;

      setOrcamentos(orcamentosRes.data || []);
      setCentrosCusto(centrosRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        centro_custo_id: formData.centro_custo_id,
        ano: parseInt(formData.ano),
        valor_total: parseFloat(formData.valor_total.replace(/\D/g, '')) / 100,
      };

      if (editingOrcamento) {
        const { error } = await (supabase
          .from('orcamento_anual') as any)
          .update(payload)
          .eq('id', editingOrcamento.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Orçamento atualizado' });
      } else {
        const { error } = await (supabase
          .from('orcamento_anual') as any)
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Orçamento criado' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar orçamento',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingOrcamento(null);
    setFormData({
      centro_custo_id: '',
      ano: new Date().getFullYear().toString(),
      valor_total: '',
    });
  };

  const handleEdit = (orcamento: Orcamento) => {
    setEditingOrcamento(orcamento);
    setFormData({
      centro_custo_id: orcamento.centro_custo_id,
      ano: orcamento.ano.toString(),
      valor_total: formatCurrencyInput(orcamento.valor_total * 100),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;

    try {
      const { error } = await supabase
        .from('orcamento_anual')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Orçamento excluído' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir orçamento',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numValue = parseInt(value) || 0;
    setFormData({ ...formData, valor_total: formatCurrencyInput(numValue) });
  };

  const getProgressPercentage = (orcamento: Orcamento) => {
    if (orcamento.valor_total === 0) return 0;
    return (orcamento.valor_utilizado / orcamento.valor_total) * 100;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <AppLayout title="Orçamento Anual">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Gerencie os orçamentos anuais por centro de custo
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="centro_custo">Centro de Custo</Label>
                <Select
                  value={formData.centro_custo_id}
                  onValueChange={(value) => setFormData({ ...formData, centro_custo_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.codigo} - {centro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Select
                  value={formData.ano}
                  onValueChange={(value) => setFormData({ ...formData, ano: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_total">Valor Total (R$)</Label>
                <Input
                  id="valor_total"
                  value={formData.valor_total}
                  onChange={handleValorChange}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingOrcamento ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Utilizado</TableHead>
              <TableHead className="w-[200px]">Progresso</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : orcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum orçamento cadastrado
                </TableCell>
              </TableRow>
            ) : (
              orcamentos.map((orcamento) => (
                <TableRow key={orcamento.id}>
                  <TableCell className="font-medium">
                    {orcamento.centros_custo?.codigo} - {orcamento.centros_custo?.nome}
                  </TableCell>
                  <TableCell>{orcamento.ano}</TableCell>
                  <TableCell>{formatCurrency(orcamento.valor_total)}</TableCell>
                  <TableCell>{formatCurrency(orcamento.valor_utilizado)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={getProgressPercentage(orcamento)} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-12">
                        {getProgressPercentage(orcamento).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(orcamento)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(orcamento.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
