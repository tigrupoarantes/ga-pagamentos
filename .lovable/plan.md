

## Plano: Integrar Workflow Dinamico no Fluxo de Aprovacoes

### Objetivo

Atualizar o sistema de aprovacoes para usar as etapas de workflow configuradas dinamicamente, em vez de um fluxo fixo. Isso inclui modificar o `AcaoAprovacaoDialog` e filtrar a pagina de `Aprovacoes` para mostrar apenas solicitacoes que o usuario pode aprovar.

---

### 1. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/aprovacoes/AcaoAprovacaoDialog.tsx` | Integrar logica de workflow dinamico |
| `src/pages/Aprovacoes.tsx` | Filtrar solicitacoes por etapa atual do usuario |
| `src/components/aprovacoes/TimelineAprovacoes.tsx` | Exibir nome da etapa dinamica |
| `src/components/aprovacoes/DetalhesSolicitacaoDialog.tsx` | Mostrar progresso do workflow |

---

### 2. Logica de Aprovacao com Workflow Dinamico

#### 2.1 Fluxo do AcaoAprovacaoDialog

```text
+------------------+     +------------------+     +------------------+
|  Buscar workflow |---->|  Identificar     |---->|  Verificar se    |
|  para CC/Empresa |     |  etapa atual     |     |  pode aprovar    |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
+------------------+     +------------------+     +------------------+
|  Atualizar       |<----|  Registrar no    |<----|  Processar       |
|  status final    |     |  historico       |     |  aprovacao       |
+------------------+     +------------------+     +------------------+
```

**Passos:**

1. Buscar workflow aplicavel usando `useWorkflow.getWorkflowParaSolicitacao()`
2. Verificar historico de aprovacoes (`aprovacoes_historico`)
3. Encontrar proxima etapa nao aprovada
4. Validar se usuario atual pode aprovar esta etapa
5. Registrar aprovacao com `etapa_id` e `nivel`
6. Determinar novo status:
   - Se ha mais etapas -> `pendente_aprovacao` (ou status custom)
   - Se ultima etapa -> `aprovada`
   - Se rejeitado -> `rejeitada`

---

### 3. Mudancas no AcaoAprovacaoDialog

#### 3.1 Novos States e Hooks

```typescript
// Importar useWorkflow
import { useWorkflow } from '@/hooks/useWorkflow';

// Adicionar estados
const [etapaAtual, setEtapaAtual] = useState<EtapaAtual | null>(null);
const [loadingEtapa, setLoadingEtapa] = useState(false);
```

#### 3.2 Buscar Etapa Atual ao Abrir

- Usar `getEtapaAtual()` do `useWorkflow` para identificar em qual etapa esta a solicitacao
- Exibir informacoes da etapa no dialog (nome, numero, total)

#### 3.3 Novo handleSubmit

```typescript
const handleSubmit = async () => {
  // 1. Registrar no historico de aprovacoes
  await registrarAprovacao(
    solicitacao.id,
    etapaAtual.etapa.id,
    user.id,
    tipo === 'aprovar' ? 'aprovado' : 'rejeitado',
    observacoes,
    etapaAtual.numero
  );
  
  // 2. Buscar proxima etapa
  const workflow = await getWorkflowParaSolicitacao(...);
  const proximaEtapa = workflow.find(e => e.ordem > etapaAtual.etapa.ordem);
  
  // 3. Atualizar status
  if (tipo === 'rejeitar') {
    novoStatus = 'rejeitada';
  } else if (proximaEtapa) {
    novoStatus = 'pendente_aprovacao';
  } else {
    novoStatus = 'aprovada';
  }
  
  // 4. Update solicitacao
  await supabase.from('solicitacoes_pagamento').update({ status });
};
```

---

### 4. Filtro na Pagina de Aprovacoes

#### 4.1 Nova Logica de Filtragem

Modificar `fetchSolicitacoes` em `Aprovacoes.tsx`:

1. Buscar todas solicitacoes com status `pendente_aprovacao`
2. Para cada uma, identificar a etapa atual
3. Verificar se o usuario logado pode aprovar nessa etapa:
   - Usuario especifico configurado como aprovador
   - Role do usuario corresponde a role da etapa
   - E gestor do centro de custo (se tipo = `gestor_cc`)
4. Filtrar e mostrar apenas as que o usuario pode aprovar

#### 4.2 Mostrar Informacao da Etapa na Tabela

Adicionar coluna "Etapa Atual" na tabela para o usuario saber em que ponto do fluxo a solicitacao esta.

---

### 5. Atualizacao do TimelineAprovacoes

#### 5.1 Usar Nome da Etapa Dinamica

Modificar para buscar o nome da etapa a partir da tabela `workflow_etapas` em vez de usar labels fixos:

```typescript
// Antes: nivelLabels[item.nivel]
// Depois: item.etapa?.nome || `Etapa ${item.nivel}`
```

---

### 6. Exibir Progresso no DetalhesSolicitacaoDialog

Adicionar componente de progresso visual:

```text
[ Etapa 1: Gestor CC ] ---> [ Etapa 2: Ger. Financeiro ] ---> [ Etapa 3: Diretor ]
      [x]                          [atual]                         [ ]
```

---

### 7. Tipos a Adicionar/Atualizar

#### 7.1 Em `src/types/workflow.ts`

Ja existe `EtapaAtual` interface. Verificar se precisa ajustar.

#### 7.2 Em `src/types/database.ts`

Atualizar `AprovacaoHistorico` para incluir `etapa_id`:

```typescript
export interface AprovacaoHistorico {
  id: string;
  solicitacao_id: string;
  etapa_id: string | null; // Adicionar
  nivel: number;
  aprovador_id: string;
  acao: 'aprovado' | 'rejeitado';
  observacoes: string | null;
  created_at: string;
}
```

---

### 8. Seguranca (RLS)

As queries ja usam `supabase as any` para contornar tipagem. As politicas RLS existentes devem cobrir:

- `workflow_etapas`: SELECT para usuarios autenticados
- `workflow_aprovadores`: SELECT para usuarios autenticados
- `aprovacoes_historico`: INSERT para aprovadores, SELECT para envolvidos

---

### 9. Resumo das Alteracoes

| Componente | O que muda |
|------------|------------|
| `AcaoAprovacaoDialog` | Buscar etapa atual, registrar com etapa_id, logica de proxima etapa |
| `Aprovacoes.tsx` | Filtrar por permissao na etapa atual, mostrar coluna de etapa |
| `TimelineAprovacoes` | Usar nome dinamico da etapa |
| `DetalhesSolicitacaoDialog` | Mostrar progresso visual do workflow |
| `types/database.ts` | Adicionar etapa_id em AprovacaoHistorico |

---

### 10. Pre-requisitos

Antes de implementar, e necessario que as tabelas `workflow_etapas`, `workflow_aprovadores` e `aprovacoes_historico` estejam criadas no Supabase com os scripts SQL fornecidos anteriormente.

