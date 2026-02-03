import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company } from '@/types/external';

export function useCompanies(search?: string) {
  return useQuery({
    queryKey: ['companies', search],
    queryFn: async (): Promise<Company[]> => {
      let query = supabase
        .from('companies')
        .select('*')
        .order('name');

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},cnpj.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }

      return data || [];
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async (): Promise<Company | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });
}
