

## Plano: Corrigir Filtro de Coluna Inexistente (external_employees.ativo)

### Problema Identificado

O erro **HTTP 400** retornado pelo Supabase:
```
"column external_employees.ativo does not exist"
```

O hook `useExternalEmployees.ts` tenta filtrar pela coluna `ativo` que nao existe na tabela real do banco de dados.

---

### Causa Raiz

O codigo foi criado com base em um esquema planejado, mas a tabela real `external_employees` no Supabase tem uma estrutura diferente. O filtro padrao `ativo = true` (linha 6 e 27-29 do hook) esta causando o erro.

---

### Solucao

Tornar o filtro `ativo` opcional e remover o valor padrao, permitindo que a query funcione mesmo sem essa coluna.

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useExternalEmployees.ts` | Remover filtro `ativo` padrao |
| `src/types/external.ts` | Tornar campo `ativo` opcional |
| `src/pages/admin/Funcionarios.tsx` | Ajustar/remover checkbox de "Apenas Ativos" |
| `src/components/selectors/FuncionarioCombobox.tsx` | Remover prop `apenasAtivos` padrao |

---

### Detalhes Tecnicos

#### 1. useExternalEmployees.ts

**Antes:**
```typescript
const { company_id, is_vendedor, ativo = true, search } = filters;
// ...
if (typeof ativo === 'boolean') {
  query = query.eq('ativo', ativo);
}
```

**Depois:**
```typescript
const { company_id, is_vendedor, ativo, search } = filters;
// ...
// Apenas aplica filtro se a coluna existir E valor for passado
if (typeof ativo === 'boolean') {
  query = query.eq('ativo', ativo);
}
```

Remover o valor padrao `= true` da linha 6.

#### 2. types/external.ts

Tornar o campo `ativo` opcional no tipo:
```typescript
ativo?: boolean;  // Era: ativo: boolean
```

#### 3. Funcionarios.tsx

Remover ou ocultar o checkbox "Apenas Ativos" ja que a coluna nao existe:
```typescript
// Remover estado e UI relacionados a apenasAtivos
// const [apenasAtivos, setApenasAtivos] = useState(true);
```

Ou manter escondido para uso futuro quando a coluna for adicionada.

#### 4. FuncionarioCombobox.tsx

Remover prop padrao:
```typescript
// Era: apenasAtivos = true
// Agora: apenasAtivos (sem default)
```

---

### Alternativa (Para o Usuario)

Se a coluna `ativo` for necessaria no futuro, voce pode adiciona-la no Supabase:

```sql
ALTER TABLE external_employees 
ADD COLUMN ativo boolean DEFAULT true;
```

Apos adicionar a coluna, o codigo atual funcionara sem modificacoes.

---

### Ordem de Implementacao

1. Atualizar `src/types/external.ts` - campo opcional
2. Atualizar `src/hooks/useExternalEmployees.ts` - remover default
3. Atualizar `src/pages/admin/Funcionarios.tsx` - ajustar UI
4. Atualizar `src/components/selectors/FuncionarioCombobox.tsx` - ajustar props

