# 🚚 Trajetto - Sistema Avançado de Gestão de Frotas

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Sanity-F03E2F?style=for-the-badge&logo=sanity&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</div>

<div align="center">
  <h3>🎯 Plataforma completa para gestão inteligente de frotas empresariais</h3>
  <p>Sistema robusto que otimiza operações logísticas, reduz custos e aumenta eficiência operacional</p>
</div>

---

## 📋 Sumário

- [📖 Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades Principais](#-funcionalidades-principais)
- [🏗️ Arquitetura](#️-arquitetura)
- [🛠️ Tecnologias](#️-tecnologias)
- [🚀 Como Executar](#-como-executar)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🔐 Sistema de Autenticação](#-sistema-de-autenticação)
- [👥 Níveis de Acesso](#-níveis-de-acesso)
- [🎨 Interface e UX](#-interface-e-ux)
- [📊 Dashboard e Analytics](#-dashboard-e-analytics)
- [🔧 Configuração](#-configuração)
- [📚 Scripts Disponíveis](#-scripts-disponíveis)
- [🤝 Contribuição](#-contribuição)

---

## 📖 Sobre o Projeto

O **Trajetto** é uma solução completa de gestão de frotas desenvolvida com tecnologias modernas para empresas que buscam excelência operacional. A plataforma oferece controle total sobre veículos, motoristas, manutenções, custos e muito mais, tudo em uma interface intuitiva e responsiva.

### 🎯 Objetivos

- **Otimização Operacional**: Reduzir custos e aumentar eficiência
- **Controle Total**: Visibilidade completa da frota em tempo real
- **Escalabilidade**: Crescer junto com seu negócio
- **Segurança**: Proteção de dados e controle de acesso granular

---

## ✨ Funcionalidades Principais

### 🚗 Gestão de Frota

- **Veículos**: Cadastro completo com histórico de manutenções
- **Motoristas**: Gestão de condutores e suas habilitações
- **Fornecedores**: Controle de parceiros e prestadores de serviços
- **Peças e Componentes**: Inventário completo de peças

### 📊 Controle Financeiro

- **Contas a Pagar**: Gestão de despesas e pagamentos
- **Multas**: Controle e acompanhamento de infrações
- **Orçamentos**: Sistema de cotações personalizadas
- **Relatórios**: Analytics detalhados de custos

### 🛠️ Manutenção e Serviços

- **Ordens de Serviço**: Planejamento e execução de manutenções
- **Histórico Completo**: Rastreabilidade total de serviços
- **Manutenção Preventiva**: Alertas e programação automática

### 📋 Gestão de Projetos

- **Sistema Kanban**: Organização visual de tarefas
- **Colaboração**: Trabalho em equipe otimizado
- **Notificações**: Alertas em tempo real

### 📝 Conteúdo e Marketing

- **Blog Integrado**: CMS via Sanity para conteúdo
- **SEO Otimizado**: Estrutura preparada para motores de busca
- **Políticas Legais**: Gestão de termos e políticas

---

## 🏗️ Arquitetura

### 🔧 Arquitetura Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 App Router                  │
├─────────────────────────────────────────────────────────────┤
│  TypeScript  │  Tailwind CSS  │  Shadcn/UI  │  Framer Motion │
├─────────────────────────────────────────────────────────────┤
│   Zustand    │  React Query   │  Socket.io  │   Leaflet Maps │
├─────────────────────────────────────────────────────────────┤
│              Auth Middleware & Permissions                  │
└─────────────────────────────────────────────────────────────┘
```

### 🛡️ Sistema de Segurança

- **Middleware Customizado**: Controle de rotas e permissões
- **JWT Authentication**: Tokens seguros com refresh automático
- **Role-Based Access**: Diferentes níveis de acesso
- **2FA Support**: Autenticação de dois fatores

### 🔄 Integração em Tempo Real

- **Socket.io**: Comunicação bidirecional
- **Live Updates**: Notificações instantâneas
- **Real-time Dashboard**: Dados atualizados automaticamente

---

## 🛠️ Tecnologias

### 🎨 Frontend Core

- **[Next.js 14](https://nextjs.org/)** - Framework React com App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utilitário
- **[Shadcn/UI](https://ui.shadcn.com/)** - Componentes reutilizáveis

### 📱 Interface e UX

- **[Framer Motion](https://www.framer.com/motion/)** - Animações fluidas
- **[Lucide React](https://lucide.dev/)** - Ícones modernos
- **[React Hook Form](https://react-hook-form.com/)** - Gerenciamento de formulários
- **[Sonner](https://sonner.emilkowal.ski/)** - Sistema de notificações

### 🔧 Estado e Dados

- **[Zustand](https://zustand-demo.pmnd.rs/)** - Gerenciamento de estado
- **[React Query](https://tanstack.com/query)** - Cache e sincronização de dados
- **[TanStack Table](https://tanstack.com/table)** - Tabelas avançadas

### 🗄️ CMS e Conteúdo

- **[Sanity](https://www.sanity.io/)** - Headless CMS
- **[Portable Text](https://www.sanity.io/docs/portable-text)** - Conteúdo estruturado
- **[Next Sanity](https://github.com/sanity-io/next-sanity)** - Integração Next.js

### 🌐 Comunicação

- **[Socket.io Client](https://socket.io/)** - WebSocket em tempo real
- **[Axios](https://axios-http.com/)** - Cliente HTTP

### 🗺️ Mapas e Geolocalização

- **[Leaflet](https://leafletjs.com/)** - Mapas interativos
- **[React Leaflet](https://react-leaflet.js.org/)** - Integração React

### 🛠️ Ferramentas de Desenvolvimento

- **[ESLint](https://eslint.org/)** - Linting de código
- **[Prettier](https://prettier.io/)** - Formatação de código
- **[Next Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)** - Análise de bundle

---

## 🚀 Como Executar

### 📋 Pré-requisitos

- Node.js 18+
- NPM ou Yarn
- Conta no Sanity (para CMS)

### 🔧 Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/trajetto.git
cd trajetto
```

2. **Instale as dependências**

```bash
npm install
# ou
yarn install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env.local
```

4. **Configure o Sanity**

```bash
npm run sanity:init
```

5. **Execute em desenvolvimento**

```bash
npm run dev
```

6. **Acesse a aplicação**

```
http://localhost:3000
```

### 🌐 Execução com Túnel (Desenvolvimento)

Para testar com webhooks do Sanity:

```bash
npm run dev:auto-tunnel
```

---

## 📁 Estrutura do Projeto

```
src/
├── 📂 app/                          # App Router (Next.js 14)
│   ├── 📂 (auth)/                   # Grupo de rotas de autenticação
│   │   ├── 📄 login/page.tsx        # Página de login
│   │   ├── 📄 forgot/page.tsx       # Recuperação de senha
│   │   └── 📄 new-verification/     # Verificação de email
│   ├── 📂 (protected)/              # Rotas protegidas
│   │   ├── 📂 admin/                # Painel administrativo
│   │   ├── 📂 dashboard/            # Dashboard do usuário
│   │   ├── 📂 profile/              # Perfil do usuário
│   │   └── 📂 notifications/        # Notificações
│   ├── 📂 blog/                     # Blog público
│   ├── 📂 api/                      # API Routes
│   └── 📄 layout.tsx                # Layout raiz
│
├── 📂 components/                    # Componentes reutilizáveis
│   ├── 📂 ui/                       # Componentes base (shadcn)
│   ├── 📂 layouts/                  # Layouts da aplicação
│   ├── 📂 auth/                     # Componentes de autenticação
│   ├── 📂 home/                     # Componentes da home
│   ├── 📂 blog/                     # Componentes do blog
│   └── 📂 forms/                    # Formulários específicos
│
├── 📂 lib/                          # Utilitários e configurações
│   ├── 📄 utils.ts                  # Funções utilitárias
│   ├── 📄 permissions.ts            # Sistema de permissões
│   └── 📄 format-values.ts          # Formatação de dados
│
├── 📂 hooks/                        # Custom hooks
│   └── 📄 use-mobile.tsx            # Hook para detecção mobile
│
├── 📂 store/                        # Gerenciamento de estado
│   └── 📄 auth-store.ts             # Store de autenticação
│
├── 📂 sanity/                       # Configuração do Sanity CMS
│   ├── 📂 schemaTypes/              # Schemas do conteúdo
│   └── 📂 lib/                      # Configurações do cliente
│
└── 📂 actions/                      # Server Actions
    ├── 📄 cookies.ts                # Manipulação de cookies
    └── 📄 dashboard.ts              # Ações do dashboard
```

---

## 🔐 Sistema de Autenticação

### 🔑 Fluxo de Autenticação

1. **Login com JWT**: Tokens seguros com refresh automático
2. **Middleware de Proteção**: Verificação em todas as rotas protegidas
3. **2FA Opcional**: Camada extra de segurança
4. **Recuperação de Senha**: Fluxo completo de redefinição

### 🛡️ Segurança Implementada

- **Token Refresh**: Renovação automática de tokens
- **Proteção CSRF**: Headers de segurança configurados
- **Rate Limiting**: Controle de tentativas de login
- **Sanitização**: Validação de entrada de dados

---

## 👥 Níveis de Acesso

### 🔴 MASTER

- Acesso total ao sistema
- Gestão de todas as empresas
- Configurações globais
- Relatórios consolidados

### 🟡 BUSINESS_ADMIN

- Gestão completa da empresa
- Configuração de usuários e permissões
- Relatórios da empresa
- Configurações avançadas

### 🟢 BUSINESS_USER

- Acesso baseado em permissões
- Operações do dia a dia
- Relatórios limitados
- Interface simplificada

---

## 🎨 Interface e UX

### 🌗 Tema Adaptativo

- **Dark/Light Mode**: Alternância automática ou manual
- **Responsive Design**: Otimizado para todos os dispositivos
- **Acessibilidade**: Padrões WCAG implementados

### ⚡ Performance

- **Server-Side Rendering**: Carregamento otimizado
- **Image Optimization**: Next.js Image com lazy loading
- **Bundle Splitting**: Carregamento sob demanda
- **Cache Inteligente**: Estratégias de cache avançadas

### 🎭 Animações e Interações

- **Framer Motion**: Transições suaves
- **Loading States**: Feedback visual consistente
- **Micro-interactions**: Detalhes que fazem a diferença

---

## 📊 Dashboard e Analytics

### 📈 Métricas Principais

- **KPIs de Frota**: Indicadores chave de performance
- **Análise de Custos**: Breakdown detalhado de despesas
- **Eficiência Operacional**: Métricas de produtividade
- **Tendências**: Análise temporal de dados

### 📋 Relatórios

- **Relatórios Dinâmicos**: Geração automática
- **Exportação**: PDF, Excel, CSV
- **Filtros Avançados**: Segmentação de dados
- **Agendamento**: Relatórios automáticos

---

## 🔧 Configuração

### 🌐 Variáveis de Ambiente

```env
# Configurações Básicas
METADATA_BASE=https://seudominio.com
NODE_ENV=production

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=seu_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_WEBHOOK_SECRET=seu_webhook_secret

# API Backend
HTTP_REQUEST=https://api.seudominio.com
NEXT_PUBLIC_HTTP_REQUEST=https://api.seudominio.com
```

### ⚙️ Configuração do Sanity

1. **Crie um projeto no Sanity**
2. **Configure os schemas de conteúdo**
3. **Configure webhooks para revalidação**
4. **Implemente as políticas de CORS**

---

## 📚 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                 # Executa em modo desenvolvimento
npm run dev:auto-tunnel     # Desenvolvimento com túnel ngrok

# Build e Produção
npm run build              # Gera build de produção
npm run start              # Inicia servidor de produção

# Qualidade de Código
npm run lint               # Executa linting do código
npm run lint:check         # Verifica formatação
npm run lint:fix           # Corrige formatação automaticamente
```

### 🚀 Deploy

```bash
# Build de produção
npm run build

# Verificação de lint
npm run lint:check

# Iniciar servidor
npm start
```

---

## 📱 Funcionalidades Mobile

### 📲 PWA Ready

- **Manifest configurado**: Instalação como app
- **Service Worker**: Cache offline
- **Responsive**: Design adaptativo
- **Touch Optimized**: Gestos otimizados

### 📍 Recursos Móveis

- **Geolocalização**: Integração com GPS
- **Mapas Interativos**: Leaflet otimizado
- **Notificações Push**: Alertas em tempo real
- **Modo Offline**: Funcionalidades essenciais

---

## 🧪 Qualidade e Testes

### 🔍 Code Quality

- **TypeScript**: Tipagem rigorosa
- **ESLint**: Regras de código consistentes
- **Prettier**: Formatação automática
- **Husky**: Git hooks para qualidade

### 📊 Performance Monitoring

- **Bundle Analyzer**: Análise de tamanho
- **Core Web Vitals**: Métricas essenciais
- **Lighthouse**: Auditoria automatizada

---

## 🌐 SEO e Marketing

### 🔍 SEO Otimizado

- **Meta Tags Dinâmicas**: Cada página otimizada
- **Sitemap Automático**: Geração dinâmica
- **Robots.txt**: Configuração inteligente
- **Schema Markup**: Dados estruturados

### 📝 Content Management

- **Blog Integrado**: Sanity CMS
- **Políticas Legais**: Gestão automatizada
- **Analytics**: Google Analytics ready
- **Social Sharing**: Open Graph configurado

---

## 🔄 Integrações

### 🔌 APIs Externas

- **Mapas**: Leaflet/OpenStreetMap
- **Notificações**: Sistema próprio
- **Email**: SMTP configurável
- **WebSockets**: Socket.io

### 📊 Analytics e Monitoring

- **Performance**: Core Web Vitals
- **Errors**: Error Boundary
- **User Tracking**: Eventos customizados

---

## 🤝 Contribuição

### 🔀 Fluxo de Contribuição

1. **Fork** o projeto
2. **Crie** uma branch (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### 📝 Padrões de Código

- **Commits**: Conventional Commits
- **TypeScript**: Tipagem rigorosa
- **Components**: Arquitetura funcional
- **Styling**: Tailwind CSS classes

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Equipe

<div align="center">
  <h3>🚀 Desenvolvido com ❤️ pela equipe Trajetto</h3>
  <p>Transformando a gestão de frotas com tecnologia de ponta</p>
</div>

---

<div align="center">
  <h3>🌟 Se este projeto foi útil, considere dar uma estrela!</h3>
  <img src="https://img.shields.io/github/stars/seu-usuario/trajetto?style=social" />
</div>
