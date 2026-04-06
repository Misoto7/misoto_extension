<div align="center">

<img src="icons/icon128.png" alt="Misoto Logo" width="96" height="96">

# Misoto

⚡ Marque todas suas aulas automaticamente  
🎬 Baixe vídeos direto da plataforma  
🧠 Ignore bloqueios de foco  

Automação completa para a plataforma Unopar / Ampli

<p align="center">
  <a href="https://github.com/Misoto7/misoto_extension">⭐ Star</a> •
  <a href="#-instalação">🚀 Instalar</a> •
  <a href="#-funcionalidades">⚙️ Funcionalidades</a>
</p>

[![Versão](https://img.shields.io/badge/versão-5.0.0-6366f1?style=flat-square)](https://github.com/Misoto7/misoto_extension)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0ea5e9?style=flat-square&logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![Status](https://img.shields.io/badge/status-active-success?style=flat-square)]()
[![Open Source](https://img.shields.io/badge/open%20source-♥-22c55e?style=flat-square)](https://github.com/Misoto7/misoto_extension)
![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)

</div>

---

## 👀 Preview

<p align="center">
  <img src="./docs/preview.gif" width="700">
</p>

---

## 💡 Por que usar o Misoto?

- Economiza horas vendo aulas manualmente  
- Automatiza tarefas repetitivas da plataforma  
- Reduz limitações de foco e presença da página
- Permite acessar e compartilhar aulas facilmente  
- Tudo em uma única extensão leve e sem dependências  

---

## 🧠 Diferenciais

- Arquitetura modular (core / features / infra / ui)  
- Sem dependências externas  
- Rate limiter com backoff exponencial  
- Logger com sanitização de dados sensíveis  
- Execução no MAIN world (nível avançado)  

---

## 🚀 Funcionalidades

### ✅ Marcação automática de aulas

- Marca a aula atual com 1 clique  
- Auto-loop (marca continuamente)  
- Marca TODAS as aulas de TODOS os cursos  
- Execução em lote com rate limit inteligente  

---

### 🎬 Download de vídeos HLS

- Detecta streams `.m3u8` automaticamente  
- Download paralelo (até 8 segmentos simultâneos)  
- Combina áudio + vídeo automaticamente  
- Salva direto no computador  
- Sem servidor externo  

---

### 🔗 Captura de URL Cogna

- Detecta automaticamente o iframe da aula  
- Extrai o link direto do conteúdo  
- Permite compartilhar aulas  

---

### 🧠 Focus Freeze

Neutraliza mecanismos comuns da plataforma:

- Bloqueio de `blur` / `focusout`  
- Controle de `document.hidden`  
- Interceptação de timers  
- Simulação de atividade  
- Liberação de interações  

Perfis disponíveis:

- **Full** → proteção máxima  
- **Soft** → modo leve  
- **Custom** → controle granular  

---

## ⚡ Como funciona

Misoto intercepta e controla o comportamento da plataforma em tempo real, utilizando múltiplos contextos do Chrome Extension MV3:

### 1. Service Worker (background)

- Intercepta requisições de rede  
- Captura tokens JWT  
- Detecta streams `.m3u8`  

---

### 2. Content Script

- Gerencia estado reativo (Store)  
- Executa as funcionalidades  
- Controla comunicação entre módulos  
- Renderiza o widget  

---

### 3. MAIN World (injeção direta)

- Executa antes de scripts da página  
- Aplica patches no `window`  
- Controla eventos de foco  

---

### 🔄 Fluxo de dados

```
Service Worker
   ↓
Content Script (Store + Features + UI)
   ↓
MAIN World (Focus Freeze)
```

---

## 🧩 Arquitetura Completa

### 📁 Estrutura de Pastas

```
misoto/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── background.js
├── popup/
│   ├── popup.html
│   └── popup.js
└── src/
    ├── content/
    │   └── content.js
    ├── core/
    │   ├── config/
    │   ├── logger/
    │   ├── rate-limiter/
    │   ├── state/
    │   └── utils/
    ├── features/
    │   ├── auto-completion/
    │   ├── cogna/
    │   ├── focus-freeze/
    │   └── video-download/
    ├── infra/
    │   ├── graphql/
    │   ├── hls/
    │   └── storage/
    ├── ui/
    │   ├── debug/
    │   └── widget/
    └── shared/
```

---

### 🧠 Camadas

| Camada | Responsabilidade |
|---|---|
| `core/` | Utilitários e base |
| `infra/` | Integrações externas |
| `features/` | Lógica principal |
| `ui/` | Interface |
| `shared/` | Eventos |

---

### 🔄 Fluxo detalhado

```
[ Service Worker ]
       ↓
[ Content Script ]
       ↓
[ MAIN World ]
```

---

### ⏱ Rate Limiter

```
MAX_REQUESTS_PER_WINDOW : 5
WINDOW_MS               : 2000
BACKOFF_MS              : 2500
BACKOFF_MULTIPLIER      : 1.5x
MAX_BACKOFF_MS          : 60000
PENALTY_MS              : 10000
```

---

## 🌐 Compatibilidade

- Google Chrome 109+  
- Navegadores Chromium (Edge, Brave, etc)  

---

## ⚙️ Instalação

```bash
git clone https://github.com/Misoto7/misoto_extension.git
```

1. Acesse: `chrome://extensions/`  
2. Ative o modo desenvolvedor  
3. Clique em **Carregar sem compactação**  
4. Selecione a pasta  

---

## 🧪 Como usar

### Widget na página

- Marcar aula com 1 clique  
- Ativar auto-loop  
- Marcar todas  
- Copiar link  
- Baixar vídeo  

---

### Popup (Focus Freeze)

- Escolher perfil  
- Ativar/desativar módulos  
- Aplicação em tempo real  

---

## 📊 Painel de Debug

- `DBG` → baixo nível  
- `NET` → rede  
- `MSG` → mensagens  
- `DOM` → DOM  
- `STG` → storage  
- `INFO` → geral  
- `WARN` → avisos  
- `ERR` → erros  

✔ Dados sensíveis são ocultados  

---

## 🔒 Segurança

- Sanitização de tokens JWT  
- Proteção de headers  
- Execução antecipada de patches  
- Escopo controlado  

---

## ⚙️ Configuração

Arquivo:

```
src/core/config/constants.js
```

```js
const RATE_LIMIT = {
  MAX_REQUESTS_PER_WINDOW: 5,
  WINDOW_MS: 2000,
  BACKOFF_MS: 2500,
};

const HLS_CONFIG = {
  MAX_CONCURRENT: 8,
  RETRY_ATTEMPTS: 3,
};

const UI = {
  AUTO_INTERVAL_DEFAULT_MS: 5000,
};
```

---

## 🤝 Contribuindo

Pull requests, issues e sugestões são muito bem-vindos.

---

## ⭐ Apoie o projeto

- ⭐ Dê uma estrela  
- 🐛 Reporte bugs  
- 💡 Sugira melhorias  

---

<div align="center">

Feito por Misoto7

---

## ⚠️ Aviso Legal

Esta extensão é para fins educacionais. O usuário é responsável por 
seu uso conforme os termos da plataforma Unopar/Ampli.


</div>
