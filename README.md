<div align="center">

<img src="icons/icon128.png" alt="Misoto Logo" width="96" height="96">

# Misoto

**Extensão de produtividade para a plataforma Ampli / Unopar**

[![Versão](https://img.shields.io/badge/versão-5.0.0-6366f1?style=flat-square)](https://github.com/Misoto7/misoto_extension)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0ea5e9?style=flat-square&logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![Open Source](https://img.shields.io/badge/open%20source-♥-22c55e?style=flat-square)](https://github.com/Misoto7/misoto_extension)

Automatiza marcação de aulas, faz download de vídeos HLS, captura dados do portal Cogna e neutraliza sistemas de detecção de foco — tudo em uma única extensão leve e sem dependências externas.

</div>

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Arquitetura](#arquitetura)
- [Configuração](#configuração)
- [Como Usar](#como-usar)
- [Painel de Debug](#painel-de-debug)
- [Segurança](#segurança)
- [Contribuindo](#contribuindo)

---

## Visão Geral

Misoto é uma extensão para navegadores baseados em Chromium que opera sobre os domínios `*.unopar.com.br` e `*.cogna.com.br`. Ela intercepta chamadas GraphQL autenticadas, gerencia estado reativo interno e injeta scripts no contexto da página principal (`MAIN world`) para fornecer controle avançado sobre eventos do browser.

A versão **5.0.0** foi reescrita com foco em:

- Arquitetura modular com separação clara entre `core`, `features`, `infra` e `ui`
- Rate limiting automático com backoff exponencial
- Logger com sanitização de tokens sensíveis
- Focus Freeze endurecido com perfis configuráveis

---

## Funcionalidades

### Marcação de Aulas

**Marcar aula atual** — envia a mutação GraphQL `CreateManyAttendances` para o objeto de aprendizagem da página aberta no momento. Um clique, uma requisição.

**Auto-loop** — repete a marcação em intervalos configuráveis (padrão: 5 s) enquanto estiver ativo. O contador de ciclos é exibido em tempo real no widget.

**Marcar tudo de uma vez** — busca a estrutura completa do curso via `getStudent` (todas as matrículas → disciplinas → unidades → seções → objetos), monta a lista de attendances e os envia em lotes de 10, com progresso exibido no widget. Uma única operação marca todas as aulas de todos os cursos matriculados.

### Download de Vídeos HLS
Detecta streams `.m3u8` interceptados pelo service worker, faz o parse de master playlists e media playlists, baixa segmentos em paralelo (até 8 simultâneos), combina trilhas de áudio separadas e salva o resultado como `.ts` via Chrome Downloads API — sem precisar de servidor externo.

### Captura e Compartilhamento de URL Cogna

O conteúdo das aulas na Unopar é carregado dentro de iframes do domínio `cms.cogna.com.br`. Para assistir normalmente, o aluno precisa estar autenticado — sem login, a plataforma bloqueia o acesso.

A extensão detecta automaticamente a URL do iframe Cogna da aula aberta (via `postMessage` e `MutationObserver`) e a exibe no widget. Essa URL é o link direto para o conteúdo da aula **sem necessidade de autenticação** — qualquer pessoa com a URL pode assistir. Isso permite compartilhar uma aula específica com alguém que não tem conta na plataforma.

### Focus Freeze
Injeta patches no `window` original (antes de qualquer outro script) para bloquear ou neutralizar os mecanismos de detecção de perda de foco mais comuns:

| Módulo | O que neutraliza |
|---|---|
| `blockBlur` | Eventos `blur` / `focusout` |
| `blockVisibility` | `visibilitychange`, `document.hidden` |
| `blockMouseLeave` | `mouseleave` no `document` |
| `blockTimers` | `setTimeout` / `setInterval` usados para polling |
| `blockKeyDetection` | Atalhos de teclado monitorados |
| `blockBattery` | Battery Status API |
| `blockNetwork` | `navigator.onLine`, eventos `online`/`offline` |
| `blockPageLifecycle` | `freeze`, `pagehide` |
| `fakeHeartbeat` | Simula atividade periódica |
| `unlockClipboard` | Remove bloqueios de `copy`/`paste` |

Disponível em três perfis: **Full** (tudo ativado), **Soft** (bloqueios passivos apenas) e **Custom** (granular via popup).

---

## Instalação

### Pré-requisitos

- Google Chrome 109+ ou qualquer navegador baseado em Chromium com suporte a Manifest V3

### Instalação em modo desenvolvedor

```bash
# 1. Clone ou extraia o repositório
git clone https://github.com/Misoto7/misoto_extension.git
# ou descompacte misoto.zip

# 2. Abra o Gerenciador de Extensões
chrome://extensions/

# 3. Ative o "Modo desenvolvedor" (canto superior direito)

# 4. Clique em "Carregar sem compactação" e selecione a pasta raiz do projeto

---

## Estrutura do Projeto

```
misoto/
├── manifest.json                        # Manifest V3 — permissões, scripts, ação
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── background.js                    # Service Worker — intercepta M3U8, gerencia token
├── popup/
│   ├── popup.html                       # Interface do popup
│   └── popup.js                        # Lógica do popup
└── src/
    ├── content/
    │   └── content.js                   # Entry point do content script
    ├── core/
    │   ├── config/
    │   │   └── constants.js             # Constantes globais imutáveis
    │   ├── logger/
    │   │   └── logger.js                # Logger com sanitização e buffer circular
    │   ├── rate-limiter/
    │   │   └── rate-limiter.js          # Rate limiter com backoff exponencial
    │   ├── state/
    │   │   └── store.js                 # Store reativo (Observer pattern)
    │   └── utils/
    │       ├── async.js                 # Helpers assíncronos
    │       ├── dom.js                   # Helpers de manipulação DOM
    │       └── network.js              # Helpers de rede
    ├── features/
    │   ├── auto-completion/
    │   │   └── auto-completion.service.js   # Auto-loop de marcação
    │   ├── cogna/
    │   │   ├── cogna-frame.js           # Listener em iframes Cogna
    │   │   ├── cogna.handlers.js        # Handlers de eventos Cogna
    │   │   ├── cogna.parser.js          # Parser de IDs da URL
    │   │   └── cogna.service.js         # Lógica de marcação via GraphQL
    │   ├── focus-freeze/
    │   │   ├── bootstrap.js             # Core do Focus Freeze (MAIN world)
    │   │   └── bridge.js               # Bridge content ↔ MAIN world
    │   └── video-download/
    │       └── video-download.service.js    # Ciclo de vida do download HLS
    ├── infra/
    │   ├── graphql/
    │   │   └── ampli-client.js          # Cliente GraphQL autenticado
    │   ├── hls/
    │   │   └── hls-downloader.js        # Parser + downloader paralelo de HLS
    │   └── storage/
    │       └── storage.js              # Wrapper sobre chrome.storage.local
    ├── shared/
    │   └── events.js                    # Catálogo de eventos do EventBus
    └── ui/
        ├── debug/
        │   ├── filters.js               # Filtros do painel de debug
        │   └── panel.js                # Renderização do painel de debug
        └── widget/
            ├── components/
            │   ├── badge.js             # Componente badge
            │   └── button.js           # Componente button
            └── widget.js               # Widget flutuante na página
```

---

## Arquitetura

### Fluxo de Dados

```
                      ┌─────────────────────┐
                      │   Service Worker    │
                      │  (background.js)    │
                      │                     │
                      │  Intercepta M3U8    │
                      │  Captura token JWT  │
                      └────────┬────────────┘
                               │ chrome.runtime.sendMessage
                               ▼
        ┌──────────────────────────────────────────────┐
        │              Content Script World            │
        │                                              │
        │  Store ──► EventBus ──► Feature Services    │
        │    │                       │                 │
        │    │         ┌─────────────┴──────────┐     │
        │    │         │     CognaService        │     │
        │    │         │   AutoCompletionService │     │
        │    │         │   VideoDownloadService  │     │
        │    │         └────────────┬────────────┘     │
        │    │                      │                  │
        │    └──────► Widget UI ◄───┘                 │
        │             DebugLog                         │
        └──────────────────────────────────────────────┘
                               │ CustomEvent / postMessage
                               ▼
        ┌──────────────────────────────────────────────┐
        │               MAIN World                     │
        │                                              │
        │   bootstrap.js (Focus Freeze core)           │
        │   — patches aplicados antes de qualquer JS   │
        └──────────────────────────────────────────────┘
```

### Camadas

| Camada | Responsabilidade |
|---|---|
| `core/` | Primitivos reutilizáveis sem dependência de negócio |
| `features/` | Lógica de cada funcionalidade; não conhece a UI |
| `infra/` | Integração com APIs externas (GraphQL, HLS, Storage) |
| `ui/` | Componentes visuais; reage a eventos do Store |
| `shared/` | Contratos compartilhados entre camadas (eventos) |

### Rate Limiter

A comunicação com o GraphQL da Ampli usa um rate limiter com janela deslizante:

```
MAX_REQUESTS_PER_WINDOW : 5 requisições
WINDOW_MS               : 2 000 ms
BACKOFF_MS              : 2 500 ms  (inicial)
BACKOFF_MULTIPLIER      : 1.5×
MAX_BACKOFF_MS          : 60 000 ms
PENALTY_MS              : 10 000 ms (em caso de 429)
```

---

## Configuração

Todas as constantes imutáveis estão centralizadas em `src/core/config/constants.js`. Para ajustar comportamentos, edite os valores antes de carregar a extensão:

```js
// Rate limit (ajuste conforme a tolerância do servidor)
const RATE_LIMIT = Object.freeze({
  MAX_REQUESTS_PER_WINDOW: 5,
  WINDOW_MS:               2_000,
  // ...
});

// HLS (ajuste o paralelismo conforme a conexão)
const HLS_CONFIG = Object.freeze({
  MAX_CONCURRENT:      8,   // segmentos simultâneos
  SEGMENT_TIMEOUT_MS:  30_000,
  RETRY_ATTEMPTS:      3,
  // ...
});

// UI
const UI = Object.freeze({
  AUTO_INTERVAL_DEFAULT_MS: 5_000,  // intervalo padrão do auto-loop
  // ...
});
```

---

## Como Usar

### 1. Widget da Página (Unopar)

Ao acessar qualquer URL em `*.unopar.com.br`, o **widget flutuante** da Misoto aparece automaticamente na página — sem precisar clicar no ícone da extensão. Por ele você:

- **Marca a aula atual** manualmente com um clique
- **Inicia/para o auto-loop** e acompanha o contador de marcações em tempo real
- **Marca tudo de uma vez** — busca todas as aulas de todos os cursos matriculados e envia em lotes com barra de progresso
- **Copia a URL Cogna** da aula aberta — link direto para o conteúdo sem necessidade de login, ideal para compartilhar
- **Inicia o download do vídeo** quando um stream `.m3u8` for detectado (a barra de progresso é exibida no próprio widget)

### 2. Popup da Extensão (Focus Freeze)

Clicar no ícone da Misoto na barra de ferramentas abre o **popup**, que é dedicado ao controle do Focus Freeze:

1. Escolha o perfil **Full**, **Soft** ou **Custom**
2. No modo Custom, ative/desative cada módulo individualmente
3. As alterações são aplicadas imediatamente em todas as abas abertas

---

## Painel de Debug

O painel de debug flutuante pode ser aberto via popup ou pelo atalho na página. Ele exibe entradas do `DebugLog` com os seguintes níveis:

| Nível | Cor | Uso |
|---|---|---|
| `DBG` | Roxo | Traces internos de baixo nível |
| `NET` | Azul claro | Requisições de rede |
| `MSG` | Verde | Mensagens entre contextos |
| `DOM` | Laranja | Operações no DOM |
| `STG` | Rosa | Leituras/escritas no Storage |
| `INFO` | Azul | Informações gerais |
| `OK` | Verde esmeralda | Operações bem-sucedidas |
| `WARN` | Amarelo | Avisos não fatais |
| `ERR` | Vermelho | Erros e falhas |

> **Tokens e dados sensíveis são automaticamente redigidos** pelo sanitizador antes de qualquer escrita no log.

---

## Segurança

- **Tokens JWT** são sanitizados em todos os logs antes de qualquer exposição
- Padrões `Bearer <token>` e cabeçalhos `Authorization` são substituídos por `[REDACTED]`
- O Focus Freeze captura referências nativas **antes** de qualquer patch de terceiros, garantindo que os mocks não possam ser revertidos por scripts da página
- Permissão `<all_urls>` é utilizada exclusivamente para injeção do Focus Freeze; requisições de rede são restritas aos domínios declarados em `host_permissions`

---


<div align="center">

Feito para estudantes da  Unopar

</div>
