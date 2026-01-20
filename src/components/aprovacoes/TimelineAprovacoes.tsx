import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { AprovacaoHistorico } from '@/types/database';
import { cn } from '@/lib/utils';

interface TimelineAprovacoesProps {
  historico: AprovacaoHistorico[];
  profiles: Map<string, { nome: string; email: string }>;
}

const nivelLabels: Record<number, string> = {
  1: 'Gestor do Centro de Custo',
  2: 'Gerente Financeiro',
  3: 'Diretor Financeiro',
};

export function TimelineAprovacoes({ historico, profiles }: TimelineAprovacoesProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (historico.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Nenhuma aprovação registrada ainda
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historico.map((item, index) => {
        const isAprovado = item.acao === 'aprovado';
        const profile = profiles.get(item.aprovador_id);

        return (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isAprovado
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                )}
              >
                {isAprovado ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              {index < historico.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {nivelLabels[item.nivel] || `Nível ${item.nivel}`}
                </span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    isAprovado
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {isAprovado ? 'Aprovado' : 'Rejeitado'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <User className="h-3 w-3" />
                {profile?.nome || 'Usuário desconhecido'}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDate(item.created_at)}
              </div>
              {item.observacoes && (
                <div className="mt-2 text-sm bg-muted p-2 rounded">
                  {item.observacoes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
