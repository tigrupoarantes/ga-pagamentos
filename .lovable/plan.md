

## Plano: Adaptar Codigo a Estrutura Real da Tabela external_employees

### Problema Identificado

O erro HTTP 400:
```
"column external_employees.nome does not exist"
```

O codigo assume que a tabela tem colunas como `nome`, `cpf`, `cargo`, etc., mas a estrutura real no banco de dados e diferente.

---

### Causa Raiz

Duas partes do hook `useExternalEmployees.ts` referenciam colunas inexistentes:

| Linha | Codigo | Problema |
|-------|--------|----------|
| 17 | `.order('nome')` | Coluna `nome` nao existe |
| 33 | `nome.ilike...cpf.ilike...` | Colunas no filtro de busca nao existem |

---

### Acao Necessaria do Usuario

Para corrigir, preciso saber a estrutura real da tabela. Voce pode descobrir isso de duas formas:

**Opcao 1 - Via Supabase Dashboard:**
1. Acesse seu projeto no Supabase
2. Va em **Table Editor** > **external_employees**
3. Veja os nomes das colunas na tabela

**Opcao 2 - Via SQL:**
Execute esta query no SQL Editor do Supabase:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'external_employees';
```

---

### Solucao Provisoria (Se a estrutura for desconhecida)

Se voce nao souber a estrutura agora, posso modificar o codigo para:

1. **Remover o `.order('nome')`** - Deixar sem ordenacao por enquanto
2. **Remover o filtro de busca** - Nao filtrar por nome/cpf
3. **Selecionar apenas `*`** - Pegar todas as colunas disponiveis
4. **Atualizar a pagina** - Exibir os dados raw e descobrir as colunas

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useExternalEmployees.ts` | Remover order e filtros por colunas inexistentes |
| `src/types/external.ts` | Tornar todos os campos opcionais |
| `src/pages/admin/Funcionarios.tsx` | Exibir dados disponiveis dinamicamente |

---

### Detalhes Tecnicos

#### 1. useExternalEmployees.ts (versao provisoria)

Remover referencias a colunas especificas:

```text
Antes:
  .order('nome')
  .or(`nome.ilike...cpf.ilike...codigo_vendedor.ilike...`)

Depois:
  .order('created_at', { ascending: false })  // ou sem order
  // Remover filtro de busca temporariamente
```

#### 2. types/external.ts

Tornar campos opcionais para aceitar qualquer estrutura:

```text
interface ExternalEmployee {
  id: string;
  company_id?: string;
  nome?: string;        // Pode nao existir
  name?: string;        // Alternativa em ingles
  cpf?: string;
  email?: string;
  cargo?: string;
  position?: string;    // Alternativa em ingles
  is_vendedor?: boolean;
  codigo_vendedor?: string;
  ativo?: boolean;
  active?: boolean;     // Alternativa em ingles
  synced_at?: string;
  created_at?: string;
  [key: string]: unknown;  // Aceitar campos extras
}
```

#### 3. Funcionarios.tsx

Exibir dados de forma adaptativa:

```text
// Usar nome ou name conforme disponivel
{employee.nome || employee.name || 'Sem nome'}
```

---

### Proximo Passo

Apos voce me informar a estrutura real da tabela, eu atualizo o codigo para usar os nomes corretos das colunas.

**Voce prefere:**
A) Aplicar a solucao provisoria agora para ver os dados
B) Primeiro verificar a estrutura da tabela e me informar

