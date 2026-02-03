import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExternalEmployee, EmployeeFilters } from '@/types/external';

export function useExternalEmployees(filters: EmployeeFilters = {}) {
  const { company_id, is_vendedor, ativo = true, search } = filters;

  return useQuery({
    queryKey: ['external_employees', filters],
    queryFn: async (): Promise<ExternalEmployee[]> => {
      let query = supabase
        .from('external_employees')
        .select(`
          *,
          company:companies(*)
        `)
        .order('nome');

      if (company_id) {
        query = query.eq('company_id', company_id);
      }

      if (typeof is_vendedor === 'boolean') {
        query = query.eq('is_vendedor', is_vendedor);
      }

      if (typeof ativo === 'boolean') {
        query = query.eq('ativo', ativo);
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`nome.ilike.${searchTerm},cpf.ilike.${searchTerm},codigo_vendedor.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching external employees:', error);
        throw error;
      }

      return (data || []) as ExternalEmployee[];
    },
  });
}

export function useExternalEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['external_employee', id],
    queryFn: async (): Promise<ExternalEmployee | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('external_employees')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching external employee:', error);
        throw error;
      }

      return data as ExternalEmployee | null;
    },
    enabled: !!id,
  });
}
