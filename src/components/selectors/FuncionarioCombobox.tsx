import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useExternalEmployees } from '@/hooks/useExternalEmployees';
import { formatCPF } from '@/types/external';

interface FuncionarioComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  companyId?: string;
  apenasVendedores?: boolean;
  apenasAtivos?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FuncionarioCombobox({
  value,
  onChange,
  companyId,
  apenasVendedores = false,
  apenasAtivos = true,
  placeholder = 'Selecione um funcionário...',
  disabled = false,
  className,
}: FuncionarioComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: employees, isLoading } = useExternalEmployees({
    company_id: companyId,
    is_vendedor: apenasVendedores ? true : undefined,
    ativo: apenasAtivos,
  });

  // Reset selection when filters change
  useEffect(() => {
    if (value && employees) {
      const exists = employees.some((e) => e.id === value);
      if (!exists) {
        onChange(undefined);
      }
    }
  }, [companyId, apenasVendedores, apenasAtivos, employees, value, onChange]);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!search.trim()) return employees;

    const searchLower = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.nome.toLowerCase().includes(searchLower) ||
        e.cpf.includes(search.replace(/\D/g, '')) ||
        (e.codigo_vendedor && e.codigo_vendedor.toLowerCase().includes(searchLower))
    );
  }, [employees, search]);

  const selectedEmployee = useMemo(() => {
    return employees?.find((e) => e.id === value);
  }, [employees, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn('w-full justify-between', className)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </span>
          ) : selectedEmployee ? (
            <span className="flex items-center gap-2 truncate">
              {selectedEmployee.nome}
              {selectedEmployee.is_vendedor && (
                <UserCheck className="h-3 w-3 text-primary" />
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar funcionário..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredEmployees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={employee.id}
                  onSelect={() => {
                    onChange(employee.id === value ? undefined : employee.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === employee.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate">{employee.nome}</span>
                      {employee.is_vendedor && (
                        <UserCheck className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatCPF(employee.cpf)}
                      {employee.codigo_vendedor && ` • ${employee.codigo_vendedor}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
