import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCompanies } from '@/hooks/useCompanies';
import { useExternalEmployees } from '@/hooks/useExternalEmployees';
import { formatCPF, formatSyncDate } from '@/types/external';
import { Users, Search, Loader2, RefreshCw, Info, UserCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Funcionarios() {
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<string>('');
  const [apenasVendedores, setApenasVendedores] = useState(false);
  const { data: companies } = useCompanies();
  const { data: employees, isLoading, error } = useExternalEmployees({
    company_id: companyId || undefined,
    is_vendedor: apenasVendedores ? true : undefined,
    search,
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-apple">
                <Users className="h-6 w-6 text-primary" />
              </div>
              Funcionários Sincronizados
            </h1>
            <p className="text-muted-foreground mt-1">
              Dados sincronizados do sistema Gestão de Ativos
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 rounded-full bg-muted cursor-help">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Dados somente leitura - sincronizados automaticamente</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main Card */}
        <Card className="shadow-apple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Funcionários</CardTitle>
                <CardDescription>
                  {employees?.length ?? 0} funcionário(s) encontrado(s)
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Sincronizado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Company Filter */}
              <Select value={companyId || '__all__'} onValueChange={(val) => setCompanyId(val === '__all__' ? '' : val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as empresas</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Checkboxes */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vendedores"
                    checked={apenasVendedores}
                    onCheckedChange={(checked) => setApenasVendedores(!!checked)}
                  />
                  <Label htmlFor="vendedores" className="text-sm cursor-pointer">
                    Apenas Vendedores
                  </Label>
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Erro ao carregar funcionários. Verifique suas permissões.
              </div>
            ) : employees && employees.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>CPF</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee, index) => (
                      <TableRow
                        key={employee.id}
                        className="hover:bg-muted/30 transition-colors"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell className="font-mono text-sm">
                          {employee.cpf ? formatCPF(employee.cpf) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {employee.full_name || 'Sem nome'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {employee.position || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {employee.company?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {employee.is_vendedor ? (
                            <Badge variant="secondary" className="gap-1">
                              <UserCheck className="h-3 w-3" />
                              {employee.codigo_vendedor || 'Vendedor'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={employee.is_active ? 'available' : 'inactive'}>
                            {employee.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum funcionário encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
