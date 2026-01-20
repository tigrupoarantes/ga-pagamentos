import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UploadAnexos } from './UploadAnexos';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  centro_custo_id: z.string().min(1, 'Selecione um centro de custo'),
  fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
  descricao: z.string().min(5, 'Descrição deve ter no mínimo 5 caracteres').max(500, 'Descrição muito longa'),
  valor: z.string().min(1, 'Informe o valor').refine((val) => {
    const num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    return !isNaN(num) && num > 0;
  }, 'Valor deve ser maior que zero'),
  data_vencimento: z.date({ required_error: 'Selecione a data de vencimento' }),
  observacoes: z.string().max(1000, 'Observações muito longas').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  cnpj: string;
}

interface NovaSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaSolicitacaoDialog({ open, onOpenChange, onSuccess }: NovaSolicitacaoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [arquivos, setArquivos] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      centro_custo_id: '',
      fornecedor_id: '',
      descricao: '',
      valor: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchData();
      form.reset();
      setArquivos([]);
    }
  }, [open]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [centrosRes, fornecedoresRes] = await Promise.all([
        supabase.from('centros_custo').select('id, codigo, nome').eq('ativo', true).order('codigo'),
        supabase.from('fornecedores').select('id, razao_social, cnpj').eq('ativo', true).order('razao_social'),
      ]);

      if (centrosRes.error) throw centrosRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;

      setCentrosCusto(centrosRes.data || []);
      setFornecedores(fornecedoresRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do formulário',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const parseValor = (valorString: string): number => {
    // Remove thousands separator and convert decimal separator
    return parseFloat(valorString.replace(/\./g, '').replace(',', '.'));
  };

  const formatValorInput = (value: string): string => {
    // Remove non-numeric characters except comma
    let cleaned = value.replace(/[^\d,]/g, '');
    
    // Ensure only one comma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + ',' + parts[1].slice(0, 2);
    }
    
    return cleaned;
  };

  const uploadAnexos = async (solicitacaoId: string) => {
    for (const arquivo of arquivos) {
      try {
        const path = `${solicitacaoId}/${Date.now()}_${arquivo.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('anexos-solicitacoes')
          .upload(path, arquivo);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('anexos-solicitacoes')
          .getPublicUrl(path);

        await (supabase.from('anexos_solicitacao') as any).insert({
          solicitacao_id: solicitacaoId,
          nome_arquivo: arquivo.name,
          tipo_arquivo: arquivo.type,
          tamanho_bytes: arquivo.size,
          storage_path: path,
          url_publica: urlData.publicUrl,
          uploaded_by: user?.id,
        });
      } catch (error) {
        console.error('Error processing attachment:', error);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar uma solicitação',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const valorNumerico = parseValor(data.valor);
      
      const { data: insertedData, error } = await (supabase.from('solicitacoes_pagamento') as any).insert({
        centro_custo_id: data.centro_custo_id,
        fornecedor_id: data.fornecedor_id,
        solicitante_id: user.id,
        descricao: data.descricao,
        valor: valorNumerico,
        data_vencimento: format(data.data_vencimento, 'yyyy-MM-dd'),
        observacoes: data.observacoes || null,
        status: 'rascunho',
      }).select('id').single();

      if (error) throw error;

      // Upload anexos se houver
      if (arquivos.length > 0 && insertedData?.id) {
        await uploadAnexos(insertedData.id);
      }

      toast({
        title: 'Sucesso',
        description: 'Solicitação criada com sucesso',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating solicitacao:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar solicitação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Pagamento</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova solicitação
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="centro_custo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {centrosCusto.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.codigo} - {cc.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fornecedor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fornecedores.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Pagamento</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo do pagamento..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <Input
                            placeholder="0,00"
                            className="pl-10"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatValorInput(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_vencimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Vencimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-4" />

              {/* Upload de Anexos */}
              <div>
                <h4 className="text-sm font-medium mb-3">Anexos (opcional)</h4>
                <UploadAnexos
                  arquivos={arquivos}
                  onArquivosChange={setArquivos}
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Solicitação
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
