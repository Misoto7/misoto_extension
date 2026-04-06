/**
 * @file src/features/cogna/cogna.handlers.js
 * @description Handlers de mensagens e navegação relacionados à feature Cogna.
 *              Liga background → Store → EventBus.
 */

'use strict';

const CognaHandlers = (() => {
  /**
   * Processa uma nova URL Cogna recebida.
   * @param {{ url: string, nomeAula?: string, timestamp?: string }} data
   */
  function onCognaUrlFound({ url, nomeAula, timestamp }) {
    if (!url || url === Store.get('cognaUrl')) return;

    Store.set({
      cognaUrl:     url,
      cognaUrlNome: nomeAula  ?? null,
      cognaCaptura: timestamp ?? null,
    });

    DebugLog.ok('Cogna: URL capturada', nomeAula ?? url);
    EventBus.emit(EVENTS.COGNA_URL_FOUND, { url, nomeAula, timestamp });
  }

  /**
   * Processa um novo token recebido do background.
   * @param {string} token
   */
  function onTokenReceived(token) {
    if (!token || token === Store.get('sessionToken')) return;

    Store.set('sessionToken', token);
    Store.set('studentId', null); // reseta para re-buscar com novo token

    DebugLog.ok('Token: novo token recebido via background');
    EventBus.emit(EVENTS.TOKEN_UPDATED, { token });
  }

  return { onCognaUrlFound, onTokenReceived };
})();
