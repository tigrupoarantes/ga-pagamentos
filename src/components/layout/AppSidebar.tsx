import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  DollarSign,
  Settings,
  LogOut,
  ChevronUp,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Solicitações',
    url: '/solicitacoes',
    icon: FileText,
  },
  {
    title: 'Aprovações',
    url: '/aprovacoes',
    icon: ClipboardCheck,
    requiresApprover: true,
  },
];

const adminItems = [
  {
    title: 'Centros de Custo',
    url: '/admin/centros-custo',
    icon: Building2,
  },
  {
    title: 'Fornecedores',
    url: '/admin/fornecedores',
    icon: Users,
  },
  {
    title: 'Empresas',
    url: '/admin/empresas',
    icon: Building2,
  },
  {
    title: 'Funcionários',
    url: '/admin/funcionarios',
    icon: Users,
  },
  {
    title: 'Orçamento Anual',
    url: '/admin/orcamento',
    icon: DollarSign,
  },
  {
    title: 'Workflow',
    url: '/admin/workflow',
    icon: ClipboardCheck,
  },
  {
    title: 'Usuários',
    url: '/admin/usuarios',
    icon: Settings,
  },
];

export function AppSidebar() {
  const { user, signOut, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const canApprove = hasRole('admin') || hasRole('aprovador');

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="p-2 bg-sidebar-primary rounded-apple shadow-apple">
            <CreditCard className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-sidebar-foreground">GA Pagamentos</span>
            <span className="text-xs text-sidebar-foreground/60">v1.0.0</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => !item.requiresApprover || canApprove)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      isActive={location.pathname === item.url}
                      className="transition-all duration-200 hover:bg-sidebar-accent"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      isActive={location.pathname === item.url}
                      className="transition-all duration-200 hover:bg-sidebar-accent"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full transition-all duration-200 hover:bg-sidebar-accent">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sidebar-foreground">{user?.email}</span>
                  <ChevronUp className="ml-auto h-4 w-4 text-sidebar-foreground/60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
