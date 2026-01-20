import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArquivoSelecionado {
  file: File;
  preview?: string;
}

interface UploadAnexosProps {
  arquivos: File[];
  onArquivosChange: (arquivos: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

const TIPOS_ACEITOS = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
};

export function UploadAnexos({
  arquivos,
  onArquivosChange,
  disabled = false,
  maxFiles = 5,
  maxSizeMB = 5,
}: UploadAnexosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const novosArquivos: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    Array.from(files).forEach((file) => {
      // Verificar tipo
      if (!Object.keys(TIPOS_ACEITOS).includes(file.type)) {
        alert(`Tipo de arquivo não suportado: ${file.name}. Use PDF, JPG ou PNG.`);
        return;
      }

      // Verificar tamanho
      if (file.size > maxSizeBytes) {
        alert(`Arquivo muito grande: ${file.name}. Máximo ${maxSizeMB}MB.`);
        return;
      }

      // Verificar limite
      if (arquivos.length + novosArquivos.length >= maxFiles) {
        alert(`Máximo de ${maxFiles} arquivos permitidos.`);
        return;
      }

      novosArquivos.push(file);
    });

    if (novosArquivos.length > 0) {
      onArquivosChange([...arquivos, ...novosArquivos]);
    }
  };

  const handleRemove = (index: number) => {
    const novosArquivos = arquivos.filter((_, i) => i !== index);
    onArquivosChange(novosArquivos);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          Arraste arquivos aqui ou
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || arquivos.length >= maxFiles}
        >
          Selecionar Arquivos
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          PDF, JPG ou PNG • Máx. {maxSizeMB}MB • Até {maxFiles} arquivos
        </p>
      </div>

      {arquivos.length > 0 && (
        <div className="space-y-2">
          {arquivos.map((arquivo, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
            >
              {getFileIcon(arquivo.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{arquivo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(arquivo.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemove(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
