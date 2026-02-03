

## Plano: Visualizacao de Dados Sincronizados (Empresas e Funcionarios)

### Resumo

Criar interfaces para visualizar empresas e funcionarios sincronizados do sistema Gestao de Ativos. Inclui duas paginas de listagem (somente leitura) e um componente reutilizavel de selecao de funcionarios (combobox).

---

### 1. Estrutura das Tabelas (Referencia)

**companies**
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | Identificador unico |
| name | text | Nome da empresa |
| cnpj | text | CNPJ formatado |
| created_at | timestamp | Data de criacao |
| synced_at | timestamp | Ultima sincronizacao |

**external_employees**
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | Identificador unico |
| company_id | uuid | Referencia a empresa |
| nome | text | Nome do funcionario |
| cpf | text | CPF (unico) |
| email | text | Email |
| cargo | text | Cargo |
| is_vendedor | boolean | Se e vendedor |
| codigo_vendedor | text | Codigo do vendedor |
| ativo | boolean | Status ativo |
| synced_at | timestamp | Ultima sincronizacao |

---

### 2. Arquivos a Criar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/types/external.ts` | Tipos | Interfaces para companies e external_employees |
| `src/hooks/useCompanies.ts` | Hook | Buscar empresas sincronizadas |
| `src/hooks/useExternalEmployees.ts` | Hook | Buscar funcionarios com filtros |
| `src/components/selectors/FuncionarioCombobox.tsx` | Componente | Combobox reutilizavel de funcionarios |
| `src/pages/admin/Empresas.tsx` | Pagina | Listagem de empresas |
| `src/pages/admin/Funcionarios.tsx` | Pagina | Listagem de funcionarios |

---

### 3. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rotas /admin/empresas e /admin/funcionarios |
| `src/components/layout/AppSidebar.tsx` | Adicionar itens de menu na secao Admin |

---

### 4. Detalhes Tecnicos

#### 4.1 Tipos (src/types/external.ts)

```text
Company
- id: string
- name: string
- cnpj: string | null
- created_at: string
- synced_at: string | null

ExternalEmployee
- id: string
- company_id: string
- nome: string
- cpf: string
- email: string | null
- cargo: string | null
- is_vendedor: boolean
- codigo_vendedor: string | null
- ativo: boolean
- synced_at: string | null
- company?: Company (join)
```

#### 4.2 Hook useCompanies

Funcoes:
- `fetchCompanies()` - Lista todas empresas
- `getCompanyById(id)` - Busca empresa especifica

Ordenacao padrao: por nome

#### 4.3 Hook useExternalEmployees

Funcoes:
- `fetchEmployees(filters)` - Lista funcionarios com filtros

Filtros disponiveis:
- `company_id`: string (filtrar por empresa)
- `is_vendedor`: boolean (somente vendedores)
- `ativo`: boolean (somente ativos)
- `search`: string (buscar por nome, cpf ou codigo)

Ordenacao padrao: por nome

---

### 5. Pagina de Empresas

**Rota:** `/admin/empresas`

**Layout:**
```text
+------------------------------------------+
| Empresas Sincronizadas              [i]  |
| Dados sincronizados do Gestao de Ativos  |
+------------------------------------------+
| [Campo de busca por nome/CNPJ]           |
+------------------------------------------+
| CNPJ          | Nome         | Ultima    |
|               |              | Sync      |
+------------------------------------------+
| 01.234.567... | Empresa A    | 01/02/25  |
| 98.765.432... | Empresa B    | 01/02/25  |
+------------------------------------------+
```

**Caracteristicas:**
- Somente leitura (dados vem do sistema externo)
- Busca por nome ou CNPJ
- Badge indicando status "Sincronizado"
- Exibicao da data da ultima sincronizacao
- Formatacao de CNPJ para exibicao

---

### 6. Pagina de Funcionarios

**Rota:** `/admin/funcionarios`

**Layout:**
```text
+--------------------------------------------------+
| Funcionarios Sincronizados                  [i]  |
| Dados sincronizados do Gestao de Ativos          |
+--------------------------------------------------+
| [Busca]  [Empresa v]  [x] Vendedores  [x] Ativos |
+--------------------------------------------------+
| CPF       | Nome    | Cargo  | Empresa | Vendedor|
+--------------------------------------------------+
| 123.456...| Joao    | Vend.  | Emp A   | V-001   |
| 987.654...| Maria   | Ger.   | Emp B   | -       |
+--------------------------------------------------+
```

**Caracteristicas:**
- Somente leitura (dados vem do sistema externo)
- Filtro por empresa (Select)
- Filtro de vendedores (Checkbox)
- Filtro de ativos (Checkbox, default: true)
- Busca por nome, CPF ou codigo vendedor
- Badge "Vendedor" quando is_vendedor = true
- Badge de status (Ativo/Inativo)
- Exibicao do codigo do vendedor quando aplicavel
- Formatacao de CPF para exibicao

---

### 7. Componente FuncionarioCombobox

**Uso:**
```text
<FuncionarioCombobox
  value={selectedId}
  onChange={setSelectedId}
  companyId="uuid-opcional"       // Filtrar por empresa
  apenasVendedores={true}         // Filtrar vendedores
  apenasAtivos={true}             // Filtrar ativos (default)
  placeholder="Selecione..."
/>
```

**Caracteristicas:**
- Baseado no componente Command (cmdk) + Popover
- Busca em tempo real (debounce 300ms)
- Exibe nome + CPF (formatado)
- Indicador de vendedor quando aplicavel
- Suporte a filtragem por empresa
- Limpa selecao quando filtros mudam

**Layout visual:**
```text
+----------------------------------+
| [Buscar funcionario...]       v  |
+----------------------------------+
  | Joao Silva - 123.456.789-00   |
  | Maria Santos - 987.654.321-00 |
  | Pedro Vendedor (V-001)        |
  +--------------------------------+
```

---

### 8. Navegacao (Sidebar)

Adicionar na secao "Administracao":

```text
Administracao
- Centros de Custo
- Fornecedores
- Empresas          <- Novo
- Funcionarios      <- Novo
- Orcamento Anual
- Workflow
- Usuarios
```

Icones sugeridos:
- Empresas: `Building` (lucide)
- Funcionarios: `Users` ou `UserCheck` (lucide)

---

### 9. Rotas (App.tsx)

Adicionar:
```text
/admin/empresas     -> Empresas.tsx
/admin/funcionarios -> Funcionarios.tsx
```

---

### 10. Tratamento de Dados

**Formatacao CPF:**
```text
12345678900 -> 123.456.789-00
```

**Formatacao CNPJ:**
```text
12345678000199 -> 12.345.678/0001-99
```

**Data de sincronizacao:**
```text
2025-02-03T10:30:00 -> 03/02/2025 10:30
```

---

### 11. Estados Visuais

**Tabela vazia:**
- "Nenhuma empresa sincronizada"
- "Nenhum funcionario encontrado"

**Loading:**
- Spinner centralizado (Loader2 do lucide)

**Sem filtros aplicados:**
- Exibir todos os registros ativos

---

### 12. Consideracoes de RLS

As tabelas `companies` e `external_employees` devem ter politicas de leitura para usuarios autenticados:

```text
SELECT para usuarios autenticados em:
- companies
- external_employees
```

Caso as politicas nao existam, as queries retornarao vazio e uma mensagem adequada sera exibida.

---

### 13. Ordem de Implementacao

1. Criar tipos em `src/types/external.ts`
2. Criar hook `useCompanies.ts`
3. Criar hook `useExternalEmployees.ts`
4. Criar pagina `Empresas.tsx`
5. Criar pagina `Funcionarios.tsx`
6. Criar componente `FuncionarioCombobox.tsx`
7. Atualizar rotas em `App.tsx`
8. Atualizar menu em `AppSidebar.tsx`

---

### 14. Estilo Visual

Seguir o GA360 Design System ja implementado:
- Cards com `shadow-apple` e `card-hover`
- Animacoes `animate-fade-in-up`
- Badges com cores semanticas
- Inputs com focus ring violeta
- Tabelas com hover na linha

