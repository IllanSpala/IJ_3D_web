# 📊 Painel Antigravity — Métricas, Tokens & Skills Globais

> **Nota**: Este documento é o seu **painel visual permanente**. Mantenha esta aba/painel aberto na IDE para consultar a qualquer momento as especificações dos modelos, contagem de tokens e a lista de skills ativas.

---

## ⚡ 1. Monitoramento de Tokens & Janela de Contexto na IDE

Para visualizar o uso dinâmico de tokens durante cada conversa:

| Localização na IDE | Informação Exibida | O que significa |
| :--- | :--- | :--- |
| **Barra de Status (Rodapé Direito)** | `Tokens: IN / OUT` | Mostra os tokens do prompt enviado + resposta gerada em tempo real. |
| **Menu do Modelo (Chat)** | `% Janela Usada` | Indica a % do limite de contexto preenchido pela conversa atual. |
| **Painel de Contexto (`Ctrl+,`)** | `Context Breakdown` | Lista o peso em tokens de cada arquivo anexado ao chat. |

---

## 🧠 2. Guia Comparativo de Modelos de IA

### 📋 Ficha Técnica dos Modelos

| Modelo | Janela Max. Contexto | Gasto Médio / Resposta | Perfil de Velocidade | Quando Usar |
| :--- | :--- | :--- | :--- | :--- |
| **`Gemini 3.6 Flash (High)`** | **1.000.000 tokens** | ~500 – 3.000 tokens | ⚡ Ultra Rápido | Desenvolvimento diário, refatoração de funções, tirar dúvidas e tarefas do dia a dia. |
| **`Claude Sonnet 4.6 (Thinking)`** | **200.000 tokens** | ~2.000 – 8.000 tokens | 🧠 Raciocínio Profundo | Resolução de bugs complexos, decisões críticas de arquitetura e lógica matemática. |
| **`Gemini 1.5 / 2.0 Pro`** | **2.000.000 tokens** | ~1.500 – 5.000 tokens | 🔍 Análise Massiva | Quando for ler um repositório inteiro ou múltiplos arquivos de documentação pesados. |

---

## 🛠️ 3. Catálogo de Skills Globais Ativas

Todas as skills abaixo estão ativas globalmente no seu sistema (`~/.geminirules` e `~/.gemini/antigravity/skills/`):

### 🎯 Skill: `/grill-me`
- **Gatilhos**: `/grill-me`, `grill me`, `test-test plano`
- **Função**: Entrevista técnica implacável para testar estresse de planos e arquiteturas antes de escrever código.
- **Diferencial**: Respostas recomendadas + busca autônoma de arquivos sem te fazer perguntas redundantes.

### 🎨 Skill: `/ui-pro-wizard`
- **Gatilhos**: `/ui-pro`, `/design`, `melhorar ui`
- **Função**: Aplicação de padrões visuais modernos (Glassmorphism, Dark Mode HSL, micro-animações CSS).
- **Diferencial**: Elimina placeholders e cria layouts responsivos de alto impacto visual.

### 🐛 Skill: `/bug-hunter`
- **Gatilhos**: `/bug-hunter`, `/review-code`, `auditar erros`
- **Função**: Varredura profunda de bugs silenciosos, erros de conversão de ponto/vírgula, case-sensitivity e vazamentos de memória.
- **Diferencial**: Retorna relatório com Severidade, Causa Raiz e Diff de Correção.

### 💾 Skill: `/db-sync-master`
- **Gatilhos**: `/db-sync`, `otimizar banco`, `migração db`
- **Função**: Garantia de integridade relacional entre SQLite (Desktop/Electron) e IndexedDB (Navegador).
- **Diferencial**: Valida backups `.zip`, migrações de schema e consistência de tipos de IDs.

### 🔐 Skill: `/pay-sec-checker`
- **Gatilhos**: `/pay-sec`, `auditar pagamento`, `segurança webhook`
- **Função**: Auditoria de segurança para checkout (InfinitePay/Stripe), rotas de API e webhooks.
- **Diferencial**: Garante idempotência (evita cobrar 2x) e checa segurança do `.env.local`.
