<div align="center">

<img src="icons/icon128.png" alt="Misoto Logo" width="96" height="96">

# Misoto

⚡ Marque todas suas aulas automaticamente  
🎬 Baixe vídeos direto da plataforma  
🧠 Ignore bloqueios de foco  

Extensão tudo-em-um para alunos da Unopar / Ampli

[![Versão](https://img.shields.io/badge/versão-5.0.0-6366f1?style=flat-square)](https://github.com/Misoto7/misoto_extension)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0ea5e9?style=flat-square&logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![Status](https://img.shields.io/badge/status-active-success?style=flat-square)]()
[![Open Source](https://img.shields.io/badge/open%20source-♥-22c55e?style=flat-square)](https://github.com/Misoto7/misoto_extension)

</div>

---

## 👀 Preview

> *(vou adicionar gif depois kkk)*

---

## 💡 Por que usar o Misoto?

- Economiza horas vendo aulas manualmente  
- Automatiza tarefas repetitivas da plataforma  
- Reduz limitações de foco e presença da página  
- Permite acessar e compartilhar aulas facilmente  
- Tudo em uma única extensão leve e sem dependências  

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

Misoto atua em **três camadas principais**:

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

## 🛣 Roadmap

- [ ] Melhorar UI  
- [ ] Exportação de aulas  
- [ ] Dashboard avançado  
- [ ] Novas plataformas  

---

## 🤝 Contribuindo

Pull requests são bem-vindos.

---

## ⭐ Apoie o projeto

- ⭐ Dê uma estrela  
- 🐛 Reporte bugs  
- 💡 Sugira melhorias  

---

<div align="center">

Feito com ❤️ por Misoto7

</div>
