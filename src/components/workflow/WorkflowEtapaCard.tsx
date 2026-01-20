import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Pencil, Trash2, Users, UserCheck, User } from 'lucide-react';
import { WorkflowEtapa, TipoEtapa } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface WorkflowEtapaCardProps {
  etapa: WorkflowEtapa;
  onEdit: (etapa: WorkflowEtapa) => void;
  onDelete: (etapa: WorkflowEtapa) => void;
  isDragging?: boolean;
}

const tipoIcons: Record<TipoEtapa, React.ReactNode> = {
  gestor_cc: <UserCheck className="h-4 w-4" />,
  role: <Users className="h-4 w-4" />,
  usuario: <User className="h-4 w-4" />,
};

const tipoLabels: Record<TipoEtapa, string> = {
  gestor_cc: 'Gestor do Centro de Custo',
  role: 'Por Função',
  usuario: 'Usuário Específico',
};

const tipoColors: Record<TipoEtapa, string> = {
  gestor_cc: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  role: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  usuario: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

export function WorkflowEtapaCard({ 
  etapa, 
  onEdit, 
  onDelete,
  isDragging 
}: WorkflowEtapaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: etapa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getAprovadoresLabel = () => {
    const aprovadores = etapa.aprovadores || [];
    if (aprovadores.length === 0) return 'Nenhum aprovador configurado';
    
    const porRole = aprovadores.filter(a => a.role).length;
    const porUsuario = aprovadores.filter(a => a.usuario_id).length;
    
    const parts = [];
    if (porRole > 0) parts.push(`${porRole} função${porRole > 1 ? 'ões' : ''}`);
    if (porUsuario > 0) parts.push(`${porUsuario} usuário${porUsuario > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  const temFaixaValor = etapa.valor_minimo !== null || etapa.valor_maximo !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50'
      )}
    >
      <Card className="border-2 hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Ordem */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              {etapa.ordem}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{etapa.nome}</h4>
                <Badge 
                  variant="secondary" 
                  className={cn('shrink-0', tipoColors[etapa.tipo])}
                >
                  {tipoIcons[etapa.tipo]}
                  <span className="ml-1">{tipoLabels[etapa.tipo]}</span>
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {getAprovadoresLabel()}
              </p>

              {temFaixaValor && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Faixa de valor:</span>
                  <Badge variant="outline" className="font-mono">
                    {etapa.valor_minimo !== null ? formatCurrency(etapa.valor_minimo) : 'R$ 0,00'}
                    {' - '}
                    {etapa.valor_maximo !== null ? formatCurrency(etapa.valor_maximo) : '∞'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(etapa)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(etapa)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
