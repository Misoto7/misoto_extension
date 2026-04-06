/**
 * @file src/features/cogna/cogna.parser.js
 * @description Extração e transformação de dados das URLs da Cogna.
 *              Puro — sem efeitos colaterais, sem acesso ao Store.
 */

'use strict';

const CognaParser = (() => {
  /**
   * Extrai o nome da aula de uma URL Cogna via parâmetro `learningObj`.
   * @param {string} url
   * @returns {string|null}
   */
  function extractLessonName(url) {
    if (!url) return null;
    const match = url.match(/learningObj=(.+?)(?:&|$)/);
    if (!match) return null;
    let name = decodeURIComponent(match[1]);
    name     = name.replace(/^aula-\d+-/, '').replace(/-/g, ' ');
    return name.split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  /**
   * Verifica se uma URL pertence ao domínio Cogna.
   * @param {string} url
   * @returns {boolean}
   */
  function isCognaUrl(url) {
    return typeof url === 'string' && url.includes(COGNA_DOMAIN);
  }

  /**
   * Extrai IDs de matrícula do pathname de uma URL Unopar SPA.
   *
   * Estrutura esperada:
   *   /enrollment/{subjectEnrollmentId}/unidade/{learningUnitId}/aula/{sectionId}/{learningObjectId}
   *
   * @param {string} [href]
   * @returns {{ subjectEnrollmentId?, learningUnitId?, sectionId?, learningObjectId? }}
   */
  function parseLessonIds(href) {
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
   * Monta a lista completa de attendances para marcação em lote.
   *
   * @param {Object} studentData - Dados retornados por getStudent()
   * @returns {Array<Object>}    - Lista de attendances prontos para a mutation
   */
  function buildAttendanceList(studentData) {
    const attendances = [];
    const now         = new Date().toISOString();

    for (const enrollment of (studentData?.getStudent?.enrollments ?? [])) {
      for (const subject of (enrollment.subjects ?? [])) {
        for (const unit of (subject.learningUnits ?? [])) {
          for (const section of (unit.sections ?? [])) {
            for (const obj of (section.learningObjects ?? [])) {
              attendances.push({
                subjectEnrollmentId: subject.id,
                learningUnitId:      unit.id,
                sectionId:           section.id,
                learningObjectId:    obj.id,
                id:                  crypto.randomUUID(),
                completionTime:      now,
              });
            }
          }
        }
      }
    }

    return attendances;
  }

  return { extractLessonName, isCognaUrl, parseLessonIds, buildAttendanceList };
})();
