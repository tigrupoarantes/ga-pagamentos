import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import type { AppRole } from '@/types/database';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  roles: AppRole[];
}

interface GerenciarRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario;
  onSuccess: () => void;
}

const allRoles: { value: AppRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acesso total ao sistema, incluindo gestão de usuários',
  },
  {
    value: 'gestor_centro_custo',
    label: 'Gestor de Centro de Custo',
    description: 'Pode gerenciar centros de custo atribuídos',
  },
  {
    value: 'aprovador',
    label: 'Aprovador',
    description: 'Pode aprovar ou rejeitar solicitações de pagamento',
  },
  {
    value: 'visualizador',
    label: 'Visualizador',
    description: 'Apenas visualização de dados, sem permissões de edição',
  },
];

export function GerenciarRolesDialog({
  open,
  onOpenChange,
  usuario,
  onSuccess,
}: GerenciarRolesDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(usuario.roles);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Deletar roles existentes
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', usuario.id);

      if (deleteError) throw deleteError;

      // Inserir novas roles
      if (selectedRoles.length > 0) {
        const inserts = selectedRoles.map((role) => ({
          user_id: usuario.id,
          role,
        }));

        const { error: insertError } = await (supabase
          .from('user_roles') as any)
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Sucesso',
        description: 'Roles atualizadas com sucesso',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Roles
          </DialogTitle>
          <DialogDescription>
            Atribua roles para <strong>{usuario.nome}</strong> ({usuario.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {allRoles.map((role) => (
            <div
              key={role.value}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={role.value}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleRoleToggle(role.value)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={role.value}
                  className="font-medium cursor-pointer"
                >
                  {role.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
