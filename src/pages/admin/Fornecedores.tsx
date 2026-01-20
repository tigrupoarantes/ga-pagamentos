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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Fornecedor {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix: string | null;
  ativo: boolean;
}

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    pix: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar fornecedores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
    if (cnpjNumbers.length !== 14) {
      toast({
        title: 'Erro',
        description: 'CNPJ deve ter 14 dígitos',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    try {
      const payload = {
        cnpj: cnpjNumbers,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        tipo_conta: formData.tipo_conta || null,
        pix: formData.pix || null,
      };

      if (editingFornecedor) {
        const { error } = await (supabase
          .from('fornecedores') as any)
          .update(payload)
          .eq('id', editingFornecedor.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Fornecedor atualizado' });
      } else {
        const { error } = await (supabase
          .from('fornecedores') as any)
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Fornecedor criado' });
      }

      setDialogOpen(false);
      resetForm();
      fetchFornecedores();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar fornecedor',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingFornecedor(null);
    setFormData({
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: '',
      pix: '',
    });
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      cnpj: formatCNPJ(fornecedor.cnpj),
      razao_social: fornecedor.razao_social,
      nome_fantasia: fornecedor.nome_fantasia || '',
      banco: fornecedor.banco || '',
      agencia: fornecedor.agencia || '',
      conta: fornecedor.conta || '',
      tipo_conta: fornecedor.tipo_conta || '',
      pix: fornecedor.pix || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Fornecedor excluído' });
      fetchFornecedores();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir fornecedor',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <AppLayout title="Fornecedores">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Gerencie os fornecedores cadastrados
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Razão social do fornecedor"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia (opcional)"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Código do banco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Agência"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="Número da conta"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                  <Select
                    value={formData.tipo_conta}
                    onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix">Chave PIX</Label>
                  <Input
                    id="pix"
                    value={formData.pix}
                    onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
                    placeholder="Chave PIX (opcional)"
                  />
                </div>
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
                  {editingFornecedor ? 'Atualizar' : 'Criar'}
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
              <TableHead>CNPJ</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : fornecedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              fornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-mono text-sm">
                    {formatCNPJ(fornecedor.cnpj)}
                  </TableCell>
                  <TableCell className="font-medium">{fornecedor.razao_social}</TableCell>
                  <TableCell>{fornecedor.nome_fantasia || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>
                      {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(fornecedor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(fornecedor.id)}
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
