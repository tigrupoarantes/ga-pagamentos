import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { WorkflowEtapa, TipoEtapa, WorkflowAprovador } from '@/types/workflow';
import { AppRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface AdicionarEtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaParaEditar?: WorkflowEtapa | null;
  empresaId: string | null;
  centroCustoId: string | null;
  proximaOrdem: number;
  onSuccess: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

const tipoLabels: Record<TipoEtapa, string> = {
  gestor_cc: 'Gestor do Centro de Custo',
  role: 'Por Função (Role)',
  usuario: 'Usuário Específico',
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  gestor_centro_custo: 'Gestor de Centro de Custo',
  aprovador: 'Aprovador',
  visualizador: 'Visualizador',
  gerente_financeiro: 'Gerente Financeiro',
  diretor_financeiro: 'Diretor Financeiro',
};

export function AdicionarEtapaDialog({
  open,
  onOpenChange,
  etapaParaEditar,
  empresaId,
  centroCustoId,
  proximaOrdem,
  onSuccess,
}: AdicionarEtapaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoEtapa>('role');
  const [valorMinimo, setValorMinimo] = useState('');
  const [valorMaximo, setValorMaximo] = useState('');
  const [aprovadores, setAprovadores] = useState<{ role?: string; usuario_id?: string }[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUsuario, setSelectedUsuario] = useState<string>('');

  const isEditing = !!etapaParaEditar;

  useEffect(() => {
    if (open) {
      fetchUsuarios();
      if (etapaParaEditar) {
        setNome(etapaParaEditar.nome);
        setTipo(etapaParaEditar.tipo);
        setValorMinimo(etapaParaEditar.valor_minimo?.toString() || '');
        setValorMaximo(etapaParaEditar.valor_maximo?.toString() || '');
        // Carregar aprovadores existentes
        const aprovadoresExistentes = (etapaParaEditar.aprovadores || []).map(a => ({
          role: a.role || undefined,
          usuario_id: a.usuario_id || undefined,
        }));
        setAprovadores(aprovadoresExistentes);
      } else {
        resetForm();
      }
    }
  }, [open, etapaParaEditar]);

  const resetForm = () => {
    setNome('');
    setTipo('role');
    setValorMinimo('');
    setValorMaximo('');
    setAprovadores([]);
    setSelectedRole('');
    setSelectedUsuario('');
  };

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .order('nome', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleAddAprovador = () => {
    if (tipo === 'role' && selectedRole) {
      if (!aprovadores.some(a => a.role === selectedRole)) {
        setAprovadores([...aprovadores, { role: selectedRole }]);
      }
      setSelectedRole('');
    } else if (tipo === 'usuario' && selectedUsuario) {
      if (!aprovadores.some(a => a.usuario_id === selectedUsuario)) {
        setAprovadores([...aprovadores, { usuario_id: selectedUsuario }]);
      }
      setSelectedUsuario('');
    }
  };

  const handleRemoveAprovador = (index: number) => {
    setAprovadores(aprovadores.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return;

    setLoading(true);
    try {
      const etapaData = {
        nome: nome.trim(),
        tipo,
        ordem: isEditing ? etapaParaEditar.ordem : proximaOrdem,
        empresa_id: empresaId,
        centro_custo_id: centroCustoId,
        valor_minimo: valorMinimo ? parseFloat(valorMinimo) : null,
        valor_maximo: valorMaximo ? parseFloat(valorMaximo) : null,
        ativo: true,
      };

      let etapaId: string;

      if (isEditing) {
        const { error } = await (supabase as any)
          .from('workflow_etapas')
          .update(etapaData)
          .eq('id', etapaParaEditar.id);

        if (error) throw error;
        etapaId = etapaParaEditar.id;

        // Remover aprovadores antigos
        await (supabase as any)
          .from('workflow_aprovadores')
          .delete()
          .eq('etapa_id', etapaId);
      } else {
        const { data, error } = await (supabase as any)
          .from('workflow_etapas')
          .insert(etapaData)
          .select()
          .single();

        if (error) throw error;
        etapaId = data.id;
      }

      // Adicionar novos aprovadores (exceto para gestor_cc que é automático)
      if (tipo !== 'gestor_cc' && aprovadores.length > 0) {
        const aprovadoresData = aprovadores.map(a => ({
          etapa_id: etapaId,
          usuario_id: a.usuario_id || null,
          role: a.role || null,
        }));

        const { error: aprovError } = await (supabase as any)
          .from('workflow_aprovadores')
          .insert(aprovadoresData);

        if (aprovError) throw aprovError;
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar etapa:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAprovadorLabel = (aprovador: { role?: string; usuario_id?: string }) => {
    if (aprovador.role) {
      return roleLabels[aprovador.role as AppRole] || aprovador.role;
    }
    if (aprovador.usuario_id) {
      const usuario = usuarios.find(u => u.id === aprovador.usuario_id);
      return usuario?.nome || usuario?.email || 'Usuário desconhecido';
    }
    return 'Desconhecido';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Etapa' : 'Adicionar Etapa'}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes desta etapa do fluxo de aprovação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome da Etapa */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Etapa</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Aprovação do Gerente"
            />
          </div>

          {/* Tipo da Etapa */}
          <div className="space-y-2">
            <Label>Tipo de Aprovação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEtapa)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tipo === 'gestor_cc' && 'O gestor vinculado ao centro de custo será o aprovador automático.'}
              {tipo === 'role' && 'Qualquer usuário com a função selecionada poderá aprovar.'}
              {tipo === 'usuario' && 'Apenas os usuários selecionados poderão aprovar.'}
            </p>
          </div>

          {/* Aprovadores (exceto gestor_cc) */}
          {tipo !== 'gestor_cc' && (
            <div className="space-y-2">
              <Label>Aprovadores</Label>
              <div className="flex gap-2">
                {tipo === 'role' ? (
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.nome || usuario.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="button" onClick={handleAddAprovador} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de aprovadores adicionados */}
              {aprovadores.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aprovadores.map((aprovador, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {getAprovadorLabel(aprovador)}
                      <button
                        onClick={() => handleRemoveAprovador(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Faixas de Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorMinimo">Valor Mínimo (opcional)</Label>
              <Input
                id="valorMinimo"
                type="number"
                value={valorMinimo}
                onChange={(e) => setValorMinimo(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorMaximo">Valor Máximo (opcional)</Label>
              <Input
                id="valorMaximo"
                type="number"
                value={valorMaximo}
                onChange={(e) => setValorMaximo(e.target.value)}
                placeholder="Sem limite"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta etapa só será aplicada para solicitações dentro desta faixa de valor.
            Deixe em branco para aplicar a todos os valores.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !nome.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
