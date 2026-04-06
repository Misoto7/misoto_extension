/**
 * @file src/core/utils/network.js
 * @description Utilitários de rede agnósticos de feature.
 */

'use strict';

/**
 * Tenta obter o título da aula atual por múltiplas fontes, em prioridade:
 *  1. Nome Cogna capturado no Store
 *  2. Nome extraído da URL Cogna
 *  3. Query GraphQL por learningObjectId
 *  4. Query GraphQL por sectionId
 *  5. Segmento legível da URL
 *  6. Fallback: 'aula'
 *
 * @returns {Promise<string>}
 */
async function fetchLessonTitle() {
  const cognaUrlNome = Store.get('cognaUrlNome');
  const cognaUrl     = Store.get('cognaUrl');
  const token        = Store.get('sessionToken');

  if (cognaUrlNome) {
    const r = sanitizeFilename(cognaUrlNome);
    if (r) return r;
  }

  if (cognaUrl) {
    const name = extractLessonNameFromCognaUrl(cognaUrl);
    const r    = sanitizeFilename(name);
    if (r) return r;
  }

  const ids = parseLessonIdsFromUrl();

  if (token) {
    const tryQuery = async (query, variables) => {
      try {
        const data = await AmpliClient.query(query, variables);
        const obj  = data ? Object.values(data)[0] : null;
        return obj?.name || obj?.title || null;
      } catch (_) { return null; }
    };

    if (ids.learningObjectId) {
      const t = await tryQuery(
        'query GetLO($id:ID!){learningObject(id:$id){id name title}}',
        { id: ids.learningObjectId }
      );
      const r = sanitizeFilename(t);
      if (r) return r;
    }

    if (ids.sectionId) {
      const t = await tryQuery(
        'query GetSec($id:ID!){section(id:$id){id name title}}',
        { id: ids.sectionId }
      );
      const r = sanitizeFilename(t);
      if (r) return r;
    }
  }

  // Fallback: segmento legível da URL
  try {
    const segs     = window.location.pathname.split('/').filter(Boolean);
    const uuidRe   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const readable = segs.filter(s => !uuidRe.test(s) && s.length > 2 && !/^\d+$/.test(s));
    if (readable.length > 0) {
      const r = sanitizeFilename(readable[readable.length - 1].replace(/-/g, ' '));
      if (r) return r;
    }
  } catch (_) {}

  return 'aula';
}
