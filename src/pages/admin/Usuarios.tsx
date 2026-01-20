import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Shield, UserCog } from 'lucide-react';
import type { AppRole } from '@/types/database';
import { GerenciarRolesDialog } from '@/components/admin/GerenciarRolesDialog';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  departamento: string | null;
  roles: AppRole[];
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  gestor_centro_custo: 'Gestor CC',
  aprovador: 'Aprovador',
  visualizador: 'Visualizador',
  gerente_financeiro: 'Gerente Financeiro',
  diretor_financeiro: 'Diretor Financeiro',
};

const roleVariants: Record<AppRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin: 'destructive',
  gestor_centro_custo: 'default',
  aprovador: 'secondary',
  visualizador: 'outline',
  gerente_financeiro: 'default',
  diretor_financeiro: 'destructive',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, departamento')
        .order('nome');

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Mapear roles para cada usuário
      const usuariosComRoles: Usuario[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
      }));

      setUsuarios(usuariosComRoles);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDialogOpen(true);
  };

  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <AppLayout title="Gestão de Usuários">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="text-muted-foreground">
          Gerencie as permissões e roles dos usuários do sistema
        </p>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Roles</TableHead>
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
            ) : filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.departamento || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {usuario.roles.length > 0 ? (
                        usuario.roles.map((role) => (
                          <Badge key={role} variant={roleVariants[role]}>
                            {roleLabels[role]}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManageRoles(usuario)}
                      title="Gerenciar Roles"
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUsuario && (
        <GerenciarRolesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          usuario={selectedUsuario}
          onSuccess={fetchUsuarios}
        />
      )}
    </AppLayout>
  );
}
