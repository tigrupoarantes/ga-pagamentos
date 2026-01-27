import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowEtapa } from '@/types/workflow';

interface WorkflowProgressBarProps {
  etapas: WorkflowEtapa[];
  etapaAtualIndex: number;
}

export function WorkflowProgressBar({ etapas, etapaAtualIndex }: WorkflowProgressBarProps) {
  if (etapas.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum workflow configurado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Progresso do Workflow ({etapaAtualIndex + 1}/{etapas.length})
      </div>
      
      <div className="flex items-center gap-1">
        {etapas.map((etapa, index) => {
          const isCompleted = index < etapaAtualIndex;
          const isCurrent = index === etapaAtualIndex;
          const isPending = index > etapaAtualIndex;

          return (
            <div key={etapa.id} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary/20 text-primary border-2 border-primary',
                    isPending && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 text-center max-w-[80px] truncate',
                    isCompleted && 'text-primary font-medium',
                    isCurrent && 'text-primary font-medium',
                    isPending && 'text-muted-foreground'
                  )}
                  title={etapa.nome}
                >
                  {etapa.nome}
                </span>
              </div>

              {/* Connector line */}
              {index < etapas.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 min-w-[20px]',
                    index < etapaAtualIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
