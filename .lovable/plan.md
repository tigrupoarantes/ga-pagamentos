

## Plano: Aplicar Identidade Visual GA360 Design System

### Resumo Executivo

Transformar o design atual do GA Pagamentos para seguir o GA360 Design System, uma estetica minimalista inspirada na Apple com:
- Nova paleta de cores baseada em **Violeta** (#8B5CF6) como cor primaria
- Tipografia SF Pro / System fonts
- Border radius maior (12px base)
- Efeitos de glassmorphism
- Sombras sutis estilo Apple
- Animacoes suaves e transicoes refinadas
- Sidebar com tema escuro

---

### 1. Comparativo de Mudancas

| Elemento | Atual | GA360 |
|----------|-------|-------|
| Cor Primaria | Azul (217 91% 60%) | Violeta (257 85% 60%) |
| Border Radius | 0.5rem (8px) | 0.75rem (12px) |
| Fonte | Inter | SF Pro / System |
| Sidebar Background | Cinza claro | Tema escuro (252 28% 14%) |
| Sombras | shadow-sm padrao | Apple-style shadows |
| Animacoes | Apenas accordion | Fade, scale, slide, float |

---

### 2. Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/index.css` | Variaveis CSS (cores, glassmorphism, transicoes) |
| `tailwind.config.ts` | Keyframes, sombras, espacamentos, border-radius |
| `src/components/ui/button.tsx` | Adicionar transicoes suaves |
| `src/components/ui/card.tsx` | Sombras Apple, hover effects |
| `src/components/ui/input.tsx` | Estados valido/invalido |
| `src/components/ui/badge.tsx` | Cores de status semanticas |
| `src/pages/Auth.tsx` | Glass card no login |
| `src/components/layout/AppSidebar.tsx` | Tema escuro |
| `src/pages/Dashboard.tsx` | Cards com hover effects |

---

### 3. Detalhes Tecnicos

#### 3.1 Novas Variaveis CSS (index.css)

**Cores Light Mode:**
```text
--primary: 257 85% 60%        (Violeta #8B5CF6)
--accent: 256 91% 67%         (Violeta Suave #A78BFA)
--background: 0 0% 100%
--foreground: 240 10% 3.9%
--success: 142 76% 36%
--info: 199 89% 48%
--status-available: 142 76% 36%
--status-allocated: 257 85% 60%
--status-maintenance: 38 92% 50%
--status-inactive: 240 3.8% 50%
```

**Cores Dark Mode:**
```text
--primary: 257 85% 65%
--accent: 256 91% 70%
--background: 240 10% 3.9%
--foreground: 0 0% 100%
```

**Sidebar (Tema Escuro):**
```text
--sidebar-background: 252 28% 14%
--sidebar-foreground: 0 0% 100%
--sidebar-primary: 257 85% 60%
--sidebar-border: 252 28% 20%
```

**Glassmorphism:**
```text
--glass-bg: rgba(255, 255, 255, 0.8)       (light)
--glass-bg: rgba(15, 15, 20, 0.85)         (dark)
--glass-border: rgba(255, 255, 255, 0.5)   (light)
--glass-border: rgba(255, 255, 255, 0.08)  (dark)
```

**Transicoes:**
```text
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-smooth: 320ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Espacamentos Apple:**
```text
--apple-sm: 0.75rem   (12px)
--apple-md: 1.5rem    (24px)
--apple-lg: 2.5rem    (40px)
--apple-xl: 4rem      (64px)
```

---

#### 3.2 Tailwind Config (tailwind.config.ts)

**Border Radius:**
```text
--radius: 0.75rem (12px base)
rounded-apple: 16px
rounded-apple-lg: 24px
```

**Sombras Apple-style:**
```text
shadow-apple: 0 2px 8px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)
shadow-apple-hover: 0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.08)
shadow-apple-lg: 0 8px 32px rgba(0,0,0,0.08), 0 16px 64px rgba(0,0,0,0.06)
shadow-glass: 0 25px 50px -12px rgba(0, 0, 0, 0.1)
shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)
```

**Novas Animacoes:**
```text
fadeIn: opacity 0 -> 1
fadeInUp: opacity + translateY(16px) -> 0
scaleIn: scale(0.95) -> 1
slideInRight: translateX(16px) -> 0
float: translateY(0) -> -10px -> 0 (infinito)
shake: translateX +/- 4px (erro)
```

**Classes Utilitarias:**
```text
.glass          - Glassmorphism basico
.glass-card     - Card com glassmorphism
.hover-scale    - Scale 1.05 no hover
.hover-lift     - Eleva + sombra
.card-hover     - Efeito completo para cards
.animate-fade-in
.animate-fade-in-up
.animate-scale-in
.animate-slide-in-right
.animate-stagger-1/2/3 (delays escalonados)
```

---

#### 3.3 Tipografia

Trocar fonte de Inter para SF Pro Display / System fonts:
```text
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", 
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

---

#### 3.4 Componentes UI

**Card (card.tsx):**
- Adicionar `shadow-card` ou `shadow-apple` como padrao
- Adicionar classes de hover opcionais

**Button (button.tsx):**
- Melhorar transicoes com `transition-all duration-200`
- Adicionar efeito de hover mais suave

**Input (input.tsx):**
- Adicionar classes `.input-valid` (borda verde)
- Adicionar classes `.input-invalid` (borda vermelha)
- Foco com cor primaria violeta

**Badge (badge.tsx):**
- Adicionar variantes de status (success, warning, info)
- Cores semanticas conforme documentacao

---

#### 3.5 Pagina de Auth

Aplicar glassmorphism no card de login:
```text
- Fundo com gradiente sutil
- Card com classe .glass-card
- Blur de 20px
- Sombra glass
- Border radius 24px
```

---

#### 3.6 Sidebar

Aplicar tema escuro conforme GA360:
```text
- Background: 252 28% 14% (roxo escuro)
- Texto: branco
- Items ativos: violeta primario
- Bordas: 252 28% 20%
```

---

#### 3.7 Dashboard

Cards com efeitos hover:
```text
- Sombra apple por padrao
- Hover lift effect
- Animacao de entrada staggered
```

---

### 4. Scrollbar Customizada

Adicionar estilo fino e discreto:
```text
width: 6px
thumb: muted-foreground com 20% opacidade
hover: 40% opacidade
border-radius: 3px
```

---

### 5. Focus States

Padronizar focus ring com cor primaria violeta:
```text
focus-visible: ring-2 ring-primary ring-offset-2
```

---

### 6. Ordem de Implementacao

1. **index.css** - Variaveis base (cores, glassmorphism, transicoes)
2. **tailwind.config.ts** - Sombras, animacoes, border-radius
3. **Componentes UI** - button, card, input, badge
4. **Auth.tsx** - Glass card no login
5. **AppSidebar** - Tema escuro
6. **Dashboard** - Cards com hover effects
7. **Testes visuais** - Verificar consistencia

---

### 7. Impacto Visual

Antes (Azul, sombras padrao, Inter):
```text
+------------------+
|  GA Pagamentos   |  <- Sidebar cinza claro
+------------------+
|   Card azul      |  <- Botoes azuis
|   sombra basica  |  <- Sombras padrao
+------------------+
```

Depois (Violeta, glassmorphism, SF Pro):
```text
+------------------+
|  GA Pagamentos   |  <- Sidebar roxo escuro
+------------------+
|   Card violeta   |  <- Botoes violeta
|   sombra apple   |  <- Efeitos glass
|   hover lift     |  <- Animacoes suaves
+------------------+
```

---

### 8. Pre-requisitos

Nenhuma dependencia adicional necessaria. Todas as mudancas sao em CSS/Tailwind e componentes existentes.

