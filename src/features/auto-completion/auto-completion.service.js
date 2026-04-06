/**
 * @file src/features/auto-completion/auto-completion.service.js
 * @description Gerencia o ciclo de vida do auto-loop de marcação.
 *              Thin wrapper sobre CognaService com controle de estado no Store.
 */

'use strict';

const AutoCompletionService = (() => {
  /**
   * Inicia o auto-loop se não estiver rodando.
   * @param {number} [intervalMs] - Intervalo em ms (padrão: Store)
   */
  function start(intervalMs) {
    if (Store.get('isAutoRunning')) {
      DebugLog.warn('AutoCompletion: loop já em execução');
      return;
    }

    if (intervalMs !== undefined) Store.set('autoIntervalMs', intervalMs);
    Store.set({ isAutoRunning: true, autoLoopCount: 0 });

    // Dispara em background — não bloqueia
    CognaService.runAutoLoop().catch((err) => {
      DebugLog.error('AutoCompletion: loop encerrou com erro', String(err));
      Store.set('isAutoRunning', false);
    });
  }

  /**
   * Para o auto-loop.
   */
  function stop() {
    if (!Store.get('isAutoRunning')) return;
    Store.set('isAutoRunning', false);
    DebugLog.info('AutoCompletion: parada solicitada');
  }

  /**
   * Alterna o estado do auto-loop.
   * @param {number} [intervalMs]
   */
  function toggle(intervalMs) {
    if (Store.get('isAutoRunning')) stop();
    else start(intervalMs);
  }

  return { start, stop, toggle };
})();
