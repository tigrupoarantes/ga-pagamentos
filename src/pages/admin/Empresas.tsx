import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCompanies } from '@/hooks/useCompanies';
import { formatCNPJ, formatSyncDate } from '@/types/external';
import { Building, Search, Loader2, RefreshCw, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Empresas() {
  const [search, setSearch] = useState('');
  const { data: companies, isLoading, error } = useCompanies(search);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-apple">
                <Building className="h-6 w-6 text-primary" />
              </div>
              Empresas Sincronizadas
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
                <CardTitle>Lista de Empresas</CardTitle>
                <CardDescription>
                  {companies?.length ?? 0} empresa(s) encontrada(s)
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Sincronizado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Erro ao carregar empresas. Verifique suas permissões.
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Última Sincronização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company, index) => (
                      <TableRow
                        key={company.id}
                        className="hover:bg-muted/30 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-mono text-sm">
                          {company.cnpj ? formatCNPJ(company.cnpj) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {formatSyncDate(company.synced_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma empresa sincronizada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
