

## Plano: Corrigir Mapeamento de Colunas da Tabela external_employees

### Problema Identificado

Os dados estao carregando, mas os nomes das colunas no codigo nao correspondem aos nomes reais no banco:

| Campo no Codigo | Campo Real no Banco |
|-----------------|---------------------|
| `nome` ou `name` | `full_name` |
| `ativo` ou `active` | `is_active` |
| `cargo` | `position` |

---

### Estrutura Real da Tabela

Baseado na resposta da API, a tabela `external_employees` tem estas colunas:

```text
id              (uuid)
cpf             (text)
external_id     (uuid)
full_name       (text)      <- Nome do funcionario
email           (text)
phone           (text)
whatsapp_phone_e164 (text)
whatsapp_opt_in (boolean)
company_id      (uuid)
unidade         (text)      <- Nome da unidade
department      (text)      <- Departamento
position        (text)      <- Cargo
is_condutor     (boolean)
cnh_numero      (text)
cnh_categoria   (text)
cnh_validade    (date)
is_vendedor     (boolean)
codigo_vendedor (text)
is_active       (boolean)   <- Status ativo
source_system   (text)
synced_at       (timestamp)
created_at      (timestamp)
updated_at      (timestamp)
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/external.ts` | Atualizar interface com campos reais |
| `src/hooks/useExternalEmployees.ts` | Habilitar busca por full_name |
| `src/pages/admin/Funcionarios.tsx` | Usar full_name, position, is_active |
| `src/components/selectors/FuncionarioCombobox.tsx` | Usar full_name |

---

### Detalhes Tecnicos

#### 1. types/external.ts

Atualizar interface para refletir estrutura real:

```text
interface ExternalEmployee {
  id: string;
  cpf: string | null;
  external_id: string | null;
  full_name: string;           // Nome correto
  email: string | null;
  phone: string | null;
  company_id: string | null;
  unidade: string | null;      // Nova
  department: string | null;   // Nova
  position: string | null;     // Cargo
  is_condutor: boolean;        // Nova
  is_vendedor: boolean;
  codigo_vendedor: string | null;
  is_active: boolean;          // Status ativo (antes: ativo)
  source_system: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
}
```

#### 2. useExternalEmployees.ts

Reativar busca usando `full_name`:

```text
if (search && search.trim()) {
  const searchTerm = `%${search.trim()}%`;
  query = query.or(
    `full_name.ilike.${searchTerm},cpf.ilike.${searchTerm},codigo_vendedor.ilike.${searchTerm}`
  );
}
```

Filtrar por `is_active` em vez de `ativo`:

```text
if (typeof ativo === 'boolean') {
  query = query.eq('is_active', ativo);
}
```

#### 3. Funcionarios.tsx

Atualizar exibicao na tabela:

```text
// Nome
{employee.full_name || 'Sem nome'}

// Cargo
{employee.position || '-'}

// Status
{employee.is_active ? 'Ativo' : 'Inativo'}
```

Adicionar colunas extras opcionais:
- Departamento: `employee.department`
- Unidade: `employee.unidade`

#### 4. FuncionarioCombobox.tsx

Atualizar para usar `full_name`:

```text
// Exibicao
{employee.full_name || 'Sem nome'}

// Busca
const nome = employee.full_name || '';
```

---

### Melhorias Adicionais

Com a estrutura real conhecida, podemos:

1. **Adicionar coluna Departamento** na tabela (opcional)
2. **Reativar filtro de Ativos** usando `is_active`
3. **Ordenar por nome** usando `full_name`

---

### Ordem de Implementacao

1. Atualizar `src/types/external.ts` com interface correta
2. Atualizar `src/hooks/useExternalEmployees.ts` com filtros corretos
3. Atualizar `src/pages/admin/Funcionarios.tsx` com campos corretos
4. Atualizar `src/components/selectors/FuncionarioCombobox.tsx`

