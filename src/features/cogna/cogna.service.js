/**
 * @file src/features/cogna/cogna.service.js
 * @description Lógica de negócio — marcação de aulas e auto-loop.
 *
 * Orquestra: AmpliClient + RateLimiter + Store + EventBus + DebugLog.
 * Não conhece a UI — emite eventos para que a UI reaja.
 */

'use strict';

const CognaService = (() => {
  // ─── Marcação individual ───────────────────────────────────────────────────

  /**
   * Marca a aula atual como concluída.
   * @returns {Promise<boolean>}
   */
  async function markLessonComplete() {
    const token = Store.get('sessionToken');
    const ids   = CognaParser.parseLessonIds();

    if (!token) {
      DebugLog.error('markLesson: token ausente');
      return false;
    }

    if (!ids.subjectEnrollmentId) {
      DebugLog.error('markLesson: subjectEnrollmentId não encontrado na URL', {
        pathname: window.location.pathname,
      });
      return false;
    }

    const requestId = crypto.randomUUID();
    const payload   = {
      operationName: 'CreateManyAttendances',
      variables: {
        data: [{
          subjectEnrollmentId: ids.subjectEnrollmentId,
          learningUnitId:      ids.learningUnitId,
          sectionId:           ids.sectionId,
          learningObjectId:    ids.learningObjectId,
          id:                  requestId,
          completionTime:      new Date().toISOString(),
        }],
      },
      query: GQL.CREATE_ATTENDANCES,
    };

    DebugLog.net('markLesson: enviando GraphQL', { requestId });

    const t0 = performance.now();
    let response;

    try {
      response = await RateLimiter.schedule(() => fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }));
    } catch (err) {
      DebugLog.error('markLesson: falha de rede', String(err));
      _recordResult(false, 'NETWORK_ERROR');
      EventBus.emit(EVENTS.LESSON_MARK_FAILED, { reason: 'NETWORK_ERROR' });
      return false;
    }

    const elapsed = Math.round(performance.now() - t0);
    _recordResult(response.ok, String(response.status), elapsed);
    DebugLog.net(`markLesson: HTTP ${response.status} em ${elapsed}ms`);

    const HTTP_ERRORS = {
      401: 'Token inválido ou expirado.',
      403: 'Sem permissão para esta operação.',
      429: 'Rate limit atingido — backoff automático.',
    };

    if (HTTP_ERRORS[response.status]) {
      DebugLog.error(`markLesson: ${HTTP_ERRORS[response.status]}`);
      EventBus.emit(EVENTS.LESSON_MARK_FAILED, { reason: `HTTP_${response.status}` });
      return false;
    }
    if (response.status >= 500) {
      DebugLog.error(`markLesson: HTTP ${response.status} — erro no servidor`);
      EventBus.emit(EVENTS.LESSON_MARK_FAILED, { reason: 'SERVER_ERROR' });
      return false;
    }
    if (!response.ok) {
      DebugLog.error(`markLesson: HTTP ${response.status} inesperado`);
      EventBus.emit(EVENTS.LESSON_MARK_FAILED, { reason: `HTTP_${response.status}` });
      return false;
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      DebugLog.error('markLesson: falha ao parsear JSON', String(err));
      return false;
    }

    if (json?.errors?.length) {
      DebugLog.error('markLesson: GraphQL errors', json.errors.map(e => e.message).join('; '));
      return false;
    }

    if (json?.data?.data === true) {
      DebugLog.ok('markLesson: ✓ aula marcada');
      Store.set('successCount', Store.get('successCount') + 1);
      EventBus.emit(EVENTS.LESSON_MARKED, { elapsed });
      return true;
    }

    DebugLog.warn('markLesson: resposta OK mas data.data !== true', { received: json?.data?.data });
    return false;
  }

  function _recordResult(ok, status, elapsed = null) {
    Store.set({ lastStatus: status, lastStatusTime: elapsed });
    if (!ok) Store.set('errorCount', Store.get('errorCount') + 1);
  }

  // ─── Auto-loop ─────────────────────────────────────────────────────────────

  /**
   * Um ciclo de marcação (absoorve exceções para não quebrar o loop).
   */
  async function sendCompletionAndAdvance() {
    DebugLog.info('── ciclo de marcação ──');
    try {
      const ok = await markLessonComplete();
      if (!ok) DebugLog.warn('sendCompletion: não confirmado neste ciclo');
    } catch (err) {
      DebugLog.error('sendCompletion: exceção', String(err));
      Store.set('errorCount', Store.get('errorCount') + 1);
    }
  }

  /**
   * Loop automático. Roda enquanto Store.get('isAutoRunning') === true.
   */
  async function runAutoLoop() {
    DebugLog.info('▶ Auto-loop iniciado', { intervaloMs: Store.get('autoIntervalMs') });
    EventBus.emit(EVENTS.AUTO_LOOP_STARTED);

    while (Store.get('isAutoRunning')) {
      const count = Store.get('autoLoopCount') + 1;
      Store.set('autoLoopCount', count);
      DebugLog.info(`Auto ciclo #${count}`);
      EventBus.emit(EVENTS.AUTO_LOOP_CYCLE, { count });
      await sendCompletionAndAdvance();
      if (Store.get('isAutoRunning')) {
        await sleep(Store.get('autoIntervalMs'));
      }
    }

    DebugLog.info('■ Auto-loop encerrado', { ciclos: Store.get('autoLoopCount') });
    EventBus.emit(EVENTS.AUTO_LOOP_STOPPED, { cycles: Store.get('autoLoopCount') });
  }

  // ─── Marcar TODAS as aulas ─────────────────────────────────────────────────

  /**
   * Marca todas as aulas de todos os cursos matriculados.
   *
   * @param {Object}   callbacks
   * @param {Function} [callbacks.onProgress] - (msg, pct) => void
   * @param {Function} [callbacks.onDone]     - (marcadas, falhas, total) => void
   * @param {Function} [callbacks.onError]    - (msg) => void
   */
  async function markAllLessonsComplete({ onProgress, onDone, onError } = {}) {
    const token = Store.get('sessionToken');

    if (!token) {
      onError?.('Token não encontrado. Acesse uma aula para capturar o token.');
      return;
    }

    // ── Passo 1: studentId ────────────────────────────────────────────────────
    onProgress?.('🔍 Identificando aluno...', 2);
    let studentId = Store.get('studentId');

    if (!studentId) {
      try {
        const data = await AmpliClient.ratedQuery(GQL.ME_ID, null, token);
        studentId  = data?.me?.id;
        if (studentId) {
          Store.set('studentId', studentId);
          DebugLog.ok(`markAll: studentId obtido: ${studentId}`);
        } else {
          throw new Error('studentId não encontrado');
        }
      } catch (err) {
        DebugLog.error('markAll: falha ao obter studentId', String(err));
        onError?.('Não foi possível identificar o aluno. Verifique se o token está válido.');
        return;
      }
    }

    // ── Passo 2: estrutura do curso ───────────────────────────────────────────
    onProgress?.('📚 Buscando estrutura do curso...', 5);
    let structData;

    try {
      structData = await AmpliClient.ratedQuery(GQL.GET_STUDENT(studentId), null, token);
      if (!structData?.getStudent) throw new Error('Estrutura de resposta inválida');
    } catch (err) {
      DebugLog.error('markAll: falha ao buscar estrutura', String(err));
      onError?.(`Erro ao buscar estrutura do curso: ${err.message}`);
      return;
    }

    // ── Passo 3: montar lista ─────────────────────────────────────────────────
    const attendances = CognaParser.buildAttendanceList(structData);

    if (attendances.length === 0) {
      onError?.('Nenhuma aula encontrada. Verifique se você está matriculado em cursos.');
      return;
    }

    DebugLog.ok(`markAll: ${attendances.length} aulas encontradas`);
    onProgress?.(`📖 ${attendances.length} aulas encontradas. Enviando...`, 10);

    // ── Passo 4: enviar em lotes ──────────────────────────────────────────────
    const BATCH_SIZE = 10;
    let marcadas = 0;
    let falhas   = 0;

    for (let i = 0; i < attendances.length; i += BATCH_SIZE) {
      const chunk   = attendances.slice(i, i + BATCH_SIZE);
      const loteNum = Math.floor(i / BATCH_SIZE) + 1;
      const pct     = Math.round(10 + (i / attendances.length) * 88);

      onProgress?.(`⬆ Lote ${loteNum} — ${marcadas}/${attendances.length} marcadas`, pct);

      try {
        const data = await AmpliClient.ratedQuery(GQL.MARK_ALL, { data: chunk }, token);
        if (data?.createManyAttendances === true) {
          marcadas += chunk.length;
          DebugLog.ok(`markAll: lote ${loteNum} OK (${marcadas}/${attendances.length})`);
        } else {
          falhas += chunk.length;
          DebugLog.warn(`markAll: lote ${loteNum} retornou false`);
        }
      } catch (err) {
        falhas += chunk.length;
        DebugLog.error(`markAll: exceção no lote ${loteNum}`, String(err));
      }

      await sleep(300);
    }

    DebugLog.ok(`markAll: CONCLUÍDO — ${marcadas} OK, ${falhas} falhas de ${attendances.length}`);
    onDone?.(marcadas, falhas, attendances.length);
  }

  return { markLessonComplete, sendCompletionAndAdvance, runAutoLoop, markAllLessonsComplete };
})();
