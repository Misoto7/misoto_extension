/**
 * @file src/core/utils/dom.js
 * @description Utilitários puros de DOM e string.
 */

'use strict';

/**
 * Trunca uma string com reticências se ultrapassar o limite.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str ?? '';
  return str.substring(0, maxLen - 1) + '…';
}

/**
 * Sanitiza string para uso como nome de arquivo.
 * @param {string} raw
 * @returns {string|null}
 */
function sanitizeFilename(raw) {
  return (raw || '')
    .trim()
    .replace(/[/:*?"<>|\\]/g, '_')
    .replace(/\s+/g, ' ')
    .substring(0, 120) || null;
}

/**
 * Formata data ISO para padrão brasileiro.
 * @param {string|null} iso
 * @returns {string}
 */
function formatDateBR(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('pt-BR'); }
  catch (_) { return ''; }
}

/**
 * Cria um elemento HTML com atributos e estilos opcionais.
 *
 * @param {string} tag
 * @param {Object} [opts]
 * @param {Object} [opts.attrs]
 * @param {Object} [opts.style]
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {string} [opts.className]
 * @returns {HTMLElement}
 */
function el(tag, opts = {}) {
  const elem = document.createElement(tag);
  if (opts.attrs)     Object.entries(opts.attrs).forEach(([k, v]) => elem.setAttribute(k, v));
  if (opts.style)     Object.assign(elem.style, opts.style);
  if (opts.className) elem.className = opts.className;
  if (opts.text)      elem.textContent = opts.text;
  if (opts.html)      elem.innerHTML   = opts.html;
  return elem;
}

/**
 * Copia texto para a área de transferência com fallback para execCommand.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const ta        = document.createElement('textarea');
      ta.value        = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (__) {
      return false;
    }
  }
}

/**
 * Extrai IDs de aula do pathname da URL (SPA Unopar).
 *
 * Estrutura esperada:
 *   /enrollment/{subjectEnrollmentId}/unidade/{learningUnitId}/aula/{sectionId}/{learningObjectId}
 *
 * @param {string} [href]
 * @returns {{ subjectEnrollmentId?, learningUnitId?, sectionId?, learningObjectId? }}
 */
function parseLessonIdsFromUrl(href) {
  try {
    const path     = href ? new URL(href).pathname : window.location.pathname;
    const segments = path.split('/');
    const get      = (key) => {
      const idx = segments.indexOf(key);
      return idx !== -1 && idx < segments.length - 1 ? segments[idx + 1] : undefined;
    };
    const aulaIdx = segments.indexOf('aula');
    return {
      subjectEnrollmentId: get('enrollment'),
      learningUnitId:      get('unidade'),
      sectionId:           get('aula'),
      learningObjectId:    aulaIdx !== -1 ? segments[aulaIdx + 2] : undefined,
    };
  } catch (_) {
    return {};
  }
}

/**
 * Extrai o nome da aula de uma URL Cogna.
 * @param {string} url
 * @returns {string|null}
 */
function extractLessonNameFromCognaUrl(url) {
  if (!url) return null;
  const match = url.match(/learningObj=(.+?)(?:&|$)/);
  if (!match) return null;
  let name = decodeURIComponent(match[1]);
  name     = name.replace(/^aula-\d+-/, '').replace(/-/g, ' ');
  return name.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

/**
 * Gera um bloco de texto formatado com dados da sessão (para clipboard).
 * @returns {string}
 */
function formatSessionDataForClipboard() {
  const ids = parseLessonIdsFromUrl();
  const sep = '─────────────────────────────────';
  return [
    '══════════════════════════════════',
    `    MISOTO v${MISOTO_VERSION} — DADOS DA SESSÃO`,
    '══════════════════════════════════',
    `Token:             ${Store.get('sessionToken')   ?? 'N/A'}`,
    sep,
    `ID do Aluno:       ${Store.get('studentId')      ?? 'N/A'}`,
    `ID da Matrícula:   ${ids.subjectEnrollmentId     ?? 'N/A'}`,
    `ID da Unidade:     ${ids.learningUnitId          ?? 'N/A'}`,
    `ID da Seção:       ${ids.sectionId               ?? 'N/A'}`,
    `ID do Conteúdo:    ${ids.learningObjectId        ?? 'N/A'}`,
    sep,
    `URL Cogna:         ${Store.get('cognaUrl')       ?? 'N/A'}`,
    `Nome da Aula:      ${Store.get('cognaUrlNome')   ?? 'N/A'}`,
    sep,
    `Capturado em:      ${new Date().toLocaleString('pt-BR')}`,
    '══════════════════════════════════',
  ].join('\n');
}
