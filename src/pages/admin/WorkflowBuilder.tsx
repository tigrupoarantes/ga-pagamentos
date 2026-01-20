import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useEmpresas } from '@/hooks/useEmpresas';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowEtapa, WorkflowContexto } from '@/types/workflow';
import { WorkflowEtapaCard } from '@/components/workflow/WorkflowEtapaCard';
import { AdicionarEtapaDialog } from '@/components/workflow/AdicionarEtapaDialog';
import { Plus, Building2, FolderTree, Globe, Loader2, ArrowDown, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  empresa_id: string | null;
}

export default function WorkflowBuilder() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { etapas, fetchEtapas, reordenarEtapas, excluirEtapa, loading } = useWorkflow();
  const { empresas, loading: loadingEmpresas } = useEmpresas();
  
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);
  const [contextoTipo, setContextoTipo] = useState<'padrao' | 'empresa' | 'centro_custo'>('padrao');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [etapaParaEditar, setEtapaParaEditar] = useState<WorkflowEtapa | null>(null);
  const [etapaParaExcluir, setEtapaParaExcluir] = useState<WorkflowEtapa | null>(null);
  const [localEtapas, setLocalEtapas] = useState<WorkflowEtapa[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Buscar centros de custo
  const fetchCentrosCusto = useCallback(async () => {
    setLoadingCentros(true);
    try {
      const { data, error } = await (supabase as any)
        .from('centros_custo')
        .select('id, codigo, nome, empresa_id')
        .eq('ativo', true)
        .order('codigo', { ascending: true });

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
    } finally {
      setLoadingCentros(false);
    }
  }, []);

  useEffect(() => {
    fetchCentrosCusto();
  }, [fetchCentrosCusto]);

  // Atualizar etapas quando contexto mudar
  useEffect(() => {
    const contexto: WorkflowContexto = {
      tipo: contextoTipo,
      empresaId: contextoTipo === 'empresa' ? selectedEmpresa : undefined,
      centroCustoId: contextoTipo === 'centro_custo' ? selectedCentroCusto : undefined,
    };
    
    if (contextoTipo === 'padrao' || 
        (contextoTipo === 'empresa' && selectedEmpresa) ||
        (contextoTipo === 'centro_custo' && selectedCentroCusto)) {
      fetchEtapas(contexto);
    }
  }, [contextoTipo, selectedEmpresa, selectedCentroCusto, fetchEtapas]);

  // Sincronizar etapas locais
  useEffect(() => {
    setLocalEtapas(etapas);
  }, [etapas]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = localEtapas.findIndex((e) => e.id === active.id);
      const newIndex = localEtapas.findIndex((e) => e.id === over.id);

      const newEtapas = arrayMove(localEtapas, oldIndex, newIndex);
      
      // Atualizar ordem local imediatamente
      const etapasComNovaOrdem = newEtapas.map((e, index) => ({
        ...e,
        ordem: index + 1,
      }));
      setLocalEtapas(etapasComNovaOrdem);

      // Persistir no banco
      const reordenadas = etapasComNovaOrdem.map(e => ({ id: e.id, ordem: e.ordem }));
      const success = await reordenarEtapas(reordenadas);
      
      if (!success) {
        // Reverter se falhou
        setLocalEtapas(etapas);
        toast({
          title: 'Erro ao reordenar',
          description: 'Não foi possível salvar a nova ordem.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ordem atualizada',
          description: 'A ordem das etapas foi salva com sucesso.',
        });
      }
    }
  };

  const handleEditEtapa = (etapa: WorkflowEtapa) => {
    setEtapaParaEditar(etapa);
    setDialogOpen(true);
  };

  const handleDeleteEtapa = (etapa: WorkflowEtapa) => {
    setEtapaParaExcluir(etapa);
  };

  const confirmDeleteEtapa = async () => {
    if (!etapaParaExcluir) return;

    const success = await excluirEtapa(etapaParaExcluir.id);
    
    if (success) {
      toast({
        title: 'Etapa excluída',
        description: 'A etapa foi removida do workflow.',
      });
      refreshEtapas();
    } else {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a etapa.',
        variant: 'destructive',
      });
    }
    
    setEtapaParaExcluir(null);
  };

  const handleAddEtapa = () => {
    setEtapaParaEditar(null);
    setDialogOpen(true);
  };

  const refreshEtapas = () => {
    const contexto: WorkflowContexto = {
      tipo: contextoTipo,
      empresaId: contextoTipo === 'empresa' ? selectedEmpresa : undefined,
      centroCustoId: contextoTipo === 'centro_custo' ? selectedCentroCusto : undefined,
    };
    fetchEtapas(contexto);
  };

  const getContextoLabel = () => {
    if (contextoTipo === 'padrao') return 'Workflow Padrão (Global)';
    if (contextoTipo === 'empresa') {
      const empresa = empresas.find(e => e.id === selectedEmpresa);
      return empresa ? `Empresa: ${empresa.nome}` : 'Selecione uma empresa';
    }
    if (contextoTipo === 'centro_custo') {
      const cc = centrosCusto.find(c => c.id === selectedCentroCusto);
      return cc ? `Centro de Custo: ${cc.codigo} - ${cc.nome}` : 'Selecione um centro de custo';
    }
    return '';
  };

  const proximaOrdem = localEtapas.length > 0 
    ? Math.max(...localEtapas.map(e => e.ordem)) + 1 
    : 1;

  if (!isAdmin()) {
    return (
      <AppLayout title="Configuração de Workflows">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </AppLayout>
    );
  }

  const centrosFiltrados = selectedEmpresa
    ? centrosCusto.filter(cc => cc.empresa_id === selectedEmpresa)
    : centrosCusto;

  return (
    <AppLayout title="Configuração de Workflows">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Configure fluxos de aprovação personalizados por empresa ou centro de custo usando drag-and-drop
          </p>
        </div>

        {/* Seleção de Contexto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Selecionar Contexto
            </CardTitle>
            <CardDescription>
              Escolha onde este workflow será aplicado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tipo de Contexto */}
              <div className="space-y-2">
                <Label>Aplicar workflow em</Label>
                <Select 
                  value={contextoTipo} 
                  onValueChange={(v) => {
                    setContextoTipo(v as typeof contextoTipo);
                    setSelectedEmpresa('');
                    setSelectedCentroCusto('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Padrão (Global)
                      </div>
                    </SelectItem>
                    <SelectItem value="empresa">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Empresa
                      </div>
                    </SelectItem>
                    <SelectItem value="centro_custo">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        Centro de Custo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Empresa */}
              {contextoTipo !== 'padrao' && (
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select 
                    value={selectedEmpresa} 
                    onValueChange={setSelectedEmpresa}
                    disabled={loadingEmpresas}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seleção de Centro de Custo */}
              {contextoTipo === 'centro_custo' && (
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select 
                    value={selectedCentroCusto} 
                    onValueChange={setSelectedCentroCusto}
                    disabled={loadingCentros}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosFiltrados.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.codigo} - {cc.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <strong>Contexto atual:</strong> {getContextoLabel()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {contextoTipo === 'padrao' && 'Este workflow será usado quando não houver um específico para a empresa ou centro de custo.'}
                {contextoTipo === 'empresa' && 'Este workflow será usado para todos os centros de custo desta empresa que não tenham workflow próprio.'}
                {contextoTipo === 'centro_custo' && 'Este workflow será usado exclusivamente para este centro de custo.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Etapas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Etapas do Workflow</CardTitle>
                <CardDescription>
                  Arraste para reordenar as etapas de aprovação
                </CardDescription>
              </div>
              <Button onClick={handleAddEtapa}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : localEtapas.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma etapa configurada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece adicionando a primeira etapa do fluxo de aprovação
                </p>
                <Button onClick={handleAddEtapa}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Etapa
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => setActiveId(event.active.id as string)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localEtapas.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {localEtapas.map((etapa, index) => (
                      <div key={etapa.id}>
                        <WorkflowEtapaCard
                          etapa={etapa}
                          onEdit={handleEditEtapa}
                          onDelete={handleDeleteEtapa}
                          isDragging={activeId === etapa.id}
                        />
                        {index < localEtapas.length - 1 && (
                          <div className="flex justify-center py-2">
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Indicador de Aprovação Final */}
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30 text-center">
                      <CheckCircle className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="font-medium text-primary">
                        Solicitação Aprovada
                      </p>
                    </div>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Adicionar/Editar Etapa */}
      <AdicionarEtapaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        etapaParaEditar={etapaParaEditar}
        empresaId={contextoTipo === 'empresa' ? selectedEmpresa : (contextoTipo === 'centro_custo' ? null : null)}
        centroCustoId={contextoTipo === 'centro_custo' ? selectedCentroCusto : null}
        proximaOrdem={proximaOrdem}
        onSuccess={refreshEtapas}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog 
        open={!!etapaParaExcluir} 
        onOpenChange={(open) => !open && setEtapaParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etapa "{etapaParaExcluir?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEtapa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
