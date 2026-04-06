/**
 * @file src/content/content.js
 * @description Entry point do content script da extensão Misoto.
 *
 * Responsabilidades:
 *  1. Bootstrapar todos os módulos (UI, services)
 *  2. Carregar estado persistido do storage
 *  3. Registrar listener de mensagens do background
 *  4. Detectar navegação SPA
 *  5. Registrar listeners globais de diagnóstico
 *
 * NÃO contém lógica de negócio — delega tudo para os services.
 */

'use strict';

// ─── Mutex para fetch de studentId ────────────────────────────────────────────
//
// Race Condition: token chega via background enquanto storage.get() já está
// em andamento → duas chamadas simultâneas com tokens diferentes.
// Solução: mutex + debounce de 50ms.

const _studentIdMutex = createMutex();
let   _studentIdDebounce = null;

function fetchAndStoreStudentId() {
  clearTimeout(_studentIdDebounce);
  _studentIdDebounce = setTimeout(() => {
    _studentIdMutex.run(_doFetchStudentId);
  }, 50);
}

async function _doFetchStudentId() {
  const token = Store.get('sessionToken');
  if (!token) { DebugLog.debug('fetchStudentId: sem token'); return; }
  if (Store.get('studentId')) { DebugLog.debug('fetchStudentId: já conhecido'); return; }

  try {
    DebugLog.net('fetchStudentId: buscando via me { id }');
    const data      = await AmpliClient.query(GQL.ME_ID, null, token);
    const studentId = data?.me?.id;

    if (!studentId) {
      DebugLog.warn('fetchStudentId: id não encontrado', data);
      return;
    }

    // Verifica se o token ainda é o mesmo (pode ter mudado durante o await)
    if (token !== Store.get('sessionToken')) {
      DebugLog.warn('fetchStudentId: token mudou durante fetch — descartando');
      return;
    }

    Store.set('studentId', studentId);
    DebugLog.ok(`fetchStudentId: ✓ ${studentId}`);
  } catch (err) {
    DebugLog.warn(`fetchStudentId: falha — ${err.message}`);

    // Se o token foi rejeitado pela API, descarta para evitar retries com token inválido
    if (/Session not found|Access Denied/i.test(err.message)) {
      DebugLog.warn('fetchStudentId: token inválido — descartando do store e storage');
      Store.set('sessionToken', null);
      Store.set('studentId', null);
      AppStorage.remove(STORAGE.TOKEN);
    }
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────

function init() {
  DebugLog.info(`══ Misoto v${MISOTO_VERSION} — inicializando ══`, {
    url:        window.location.href,
    readyState: document.readyState,
  });

  // ── Monta a UI ─────────────────────────────────────────────────────────────
  createWidget();
  createDebugPanel();

  // ── Log inicial de IDs ─────────────────────────────────────────────────────
  const ids = CognaParser.parseLessonIds();
  DebugLog.debug('IDs extraídos da URL inicial', ids);
  if (!ids.subjectEnrollmentId) {
    DebugLog.debug('subjectEnrollmentId ausente — página não é de aula');
  }

  // ── Carrega estado persistido ──────────────────────────────────────────────
  AppStorage.get([
    STORAGE.TOKEN,
    STORAGE.URL_COGNA,
    STORAGE.NOME_AULA,
    STORAGE.ULTIMA_CAPTURA,
  ]).then((result) => {
    if (result[STORAGE.TOKEN]) {
      Store.set('sessionToken', result[STORAGE.TOKEN]);
      DebugLog.ok('Token carregado do storage');
      fetchAndStoreStudentId();
    } else {
      DebugLog.info('Token ainda não disponível — aguardando interceptação GraphQL');
    }

    if (result[STORAGE.URL_COGNA]) {
      Store.set({
        cognaUrl:     result[STORAGE.URL_COGNA],
        cognaUrlNome: result[STORAGE.NOME_AULA]      ?? null,
        cognaCaptura: result[STORAGE.ULTIMA_CAPTURA] ?? null,
      });
      DebugLog.ok('URL Cogna carregada do storage', result[STORAGE.NOME_AULA]);
    }
  }).catch((err) => {
    DebugLog.error('Storage: erro ao carregar estado inicial', err.message);
  });

  // ── Listener de mensagens do background ───────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender) => {
    DebugLog.msg('Mensagem recebida', { type: msg.type });

    switch (msg.type) {
      case MSG.TOKEN:
        CognaHandlers.onTokenReceived(msg.token);
        fetchAndStoreStudentId();
        break;

      case MSG.M3U8_DETECTED:
        if (msg.url) addM3U8Stream(msg.url);
        break;

      case MSG.COGNA_URL_FOUND:
        CognaHandlers.onCognaUrlFound({
          url:       msg.url,
          nomeAula:  msg.nomeAula,
          timestamp: msg.timestamp,
        });
        break;

      // Focus Freeze messages são tratadas pelo bridge.js
      default:
        if (!msg.type?.startsWith('FF_')) {
          DebugLog.warn('Mensagem com tipo desconhecido', { type: msg.type });
        }
    }
  });

  // ── Monitor de navegação SPA ───────────────────────────────────────────────
  let lastHref = window.location.href;
  setInterval(() => {
    const current = window.location.href;
    if (current !== lastHref) {
      DebugLog.info('Navegação SPA detectada', { de: lastHref, para: current });
      lastHref = current;
      DebugLog.debug('Novos IDs pós-navegação', CognaParser.parseLessonIds());
      updateDataDisplay();
      if (Store.get('sessionToken') && !Store.get('studentId')) {
        fetchAndStoreStudentId();
      }
    }
  }, 1_000);

  // ── Diagnóstico global ────────────────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    DebugLog.info(`Visibilidade: ${document.visibilityState}`);
  });
  window.addEventListener('error', (ev) => {
    DebugLog.error('Erro global JS', `${ev.message} @ ${ev.filename}:${ev.lineno}`);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    DebugLog.error('Promise rejeitada', String(ev.reason));
  });
  window.addEventListener('online',  () => DebugLog.ok('Rede restaurada'));
  window.addEventListener('offline', () => DebugLog.error('Rede perdida'));

  DebugLog.info('══ Init concluído — widget pronto ══');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
