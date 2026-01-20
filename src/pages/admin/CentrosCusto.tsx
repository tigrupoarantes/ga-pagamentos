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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  gestor_id: string | null;
  ativo: boolean;
}

export default function CentrosCusto() {
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroCusto | null>(null);
  const [formData, setFormData] = useState({ codigo: '', nome: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchCentros();
  }, []);

  const fetchCentros = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('*')
        .order('codigo');

      if (error) throw error;
      setCentros(data || []);
    } catch (error) {
      console.error('Error fetching centros:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar centros de custo',
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
      if (editingCentro) {
        const { error } = await supabase
          .from('centros_custo')
          .update({ codigo: formData.codigo, nome: formData.nome })
          .eq('id', editingCentro.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Centro de custo atualizado' });
      } else {
        const { error } = await supabase
          .from('centros_custo')
          .insert({ codigo: formData.codigo, nome: formData.nome });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Centro de custo criado' });
      }

      setDialogOpen(false);
      setEditingCentro(null);
      setFormData({ codigo: '', nome: '' });
      fetchCentros();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar centro de custo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (centro: CentroCusto) => {
    setEditingCentro(centro);
    setFormData({ codigo: centro.codigo, nome: centro.nome });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este centro de custo?')) return;

    try {
      const { error } = await supabase
        .from('centros_custo')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Centro de custo excluído' });
      fetchCentros();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir centro de custo',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingCentro(null);
    setFormData({ codigo: '', nome: '' });
    setDialogOpen(true);
  };

  return (
    <AppLayout title="Centros de Custo">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Gerencie os centros de custo da organização
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Centro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: CC001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do centro de custo"
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
                  {editingCentro ? 'Atualizar' : 'Criar'}
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
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : centros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum centro de custo cadastrado
                </TableCell>
              </TableRow>
            ) : (
              centros.map((centro) => (
                <TableRow key={centro.id}>
                  <TableCell className="font-medium">{centro.codigo}</TableCell>
                  <TableCell>{centro.nome}</TableCell>
                  <TableCell>
                    <Badge variant={centro.ativo ? 'default' : 'secondary'}>
                      {centro.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(centro)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(centro.id)}
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
