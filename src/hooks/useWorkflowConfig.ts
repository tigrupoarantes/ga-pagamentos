import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowConfig } from '@/types/database';

export function useWorkflowConfig() {
  const [config, setConfig] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_config')
        .select('*');

      if (error) throw error;
      setConfig(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const getLimiteDiretorFinanceiro = (): number => {
    const limite = config.find(c => c.chave === 'limite_diretor_financeiro');
    return limite ? parseFloat(limite.valor) : 50000;
  };

  const updateConfig = async (chave: string, valor: string) => {
    const { error } = await (supabase
      .from('workflow_config') as any)
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave);

    if (error) throw error;
    await fetchConfig();
  };

  return {
    config,
    loading,
    error,
    getLimiteDiretorFinanceiro,
    updateConfig,
    refetch: fetchConfig,
  };
}
