import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa } from '@/types/workflow';

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const criarEmpresa = useCallback(async (
    empresa: Omit<Empresa, 'id' | 'created_at'>
  ): Promise<Empresa | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('empresas')
        .insert(empresa)
        .select()
        .single();

      if (error) throw error;
      await fetchEmpresas();
      return data;
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      return null;
    }
  }, [fetchEmpresas]);

  const atualizarEmpresa = useCallback(async (
    id: string,
    updates: Partial<Empresa>
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('empresas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchEmpresas();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      return false;
    }
  }, [fetchEmpresas]);

  return {
    empresas,
    loading,
    fetchEmpresas,
    criarEmpresa,
    atualizarEmpresa,
  };
}
