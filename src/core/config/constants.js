/**
 * @file src/core/config/constants.js
 * @description Constantes globais e imutáveis da extensão Misoto.
 *              Centraliza configurações que NÃO devem ser alteradas em runtime.
 */

'use strict';

// ─── Versão ───────────────────────────────────────────────────────────────────

const MISOTO_VERSION = '5.0.0';

// ─── Endpoints ────────────────────────────────────────────────────────────────

const GRAPHQL_URL  = 'https://graphql.ampli.com.br/';
const COGNA_DOMAIN = 'cms.cogna.com.br';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE = Object.freeze({
  TOKEN:           'token',
  URL_COGNA:       'urlCogna',
  NOME_AULA:       'nomeAula',
  ULTIMA_CAPTURA:  'ultimaCaptura',
  WIDGET_POS:      'misoto_widget_pos',
  DEBUG_POS:       'misoto_debug_pos',
  FF_STATE:        'ff_state_v5',
});

// ─── GraphQL Queries / Mutations ──────────────────────────────────────────────

const GQL = Object.freeze({
  ME_ID: '{ me { id } }',

  CREATE_ATTENDANCES: `
    mutation CreateManyAttendances($data: [CreateAttendanceInput!]!) {
      data: createManyAttendances(data: $data)
    }
  `.trim(),

  MARK_ALL: `
    mutation Mark($data: [CreateAttendanceInput!]!) {
      createManyAttendances(data: $data)
    }
  `.trim(),

  GET_STUDENT: (studentId) => `{
    getStudent(studentId: "${studentId}") {
      enrollments {
        id
        subjects {
          id
          learningUnits {
            id
            sections {
              id
              learningObjects { id }
            }
          }
        }
      }
    }
  }`,
});

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const RATE_LIMIT = Object.freeze({
  MAX_REQUESTS_PER_WINDOW: 5,
  WINDOW_MS:               2_000,
  BACKOFF_MS:              2_500,
  PENALTY_MS:              10_000,
  BACKOFF_MULTIPLIER:      1.5,
  MAX_BACKOFF_MS:          60_000,
});

// ─── HLS ──────────────────────────────────────────────────────────────────────

const HLS_CONFIG = Object.freeze({
  MAX_CONCURRENT:      8,
  SEGMENT_TIMEOUT_MS:  30_000,
  RETRY_ATTEMPTS:      3,
  RETRY_DELAY_BASE_MS: 1_000,
});

// ─── UI ───────────────────────────────────────────────────────────────────────

const UI = Object.freeze({
  AUTO_INTERVAL_DEFAULT_MS: 5_000,
  DATA_REFRESH_INTERVAL_MS: 2_000,
  DEBUG_MAX_ENTRIES:        300,
  TOAST_DURATION_MS:        3_000,
  DRAG_THROTTLE_MS:         16,
});

// ─── Focus Freeze ─────────────────────────────────────────────────────────────

const FF_PROFILES = Object.freeze({
  FULL:   'full',
  SOFT:   'soft',
  CUSTOM: 'custom',
});

const FF_DEFAULT_STATE = Object.freeze({
  enabled: true,
  profile: FF_PROFILES.FULL,
  stats: {
    blurBlocked:       0,
    visibilityBlocked: 0,
    timersIntercepted: 0,
    eventsBlocked:     0,
    sessionStart:      null,
  },
  custom: {
    blockBlur:          true,
    blockVisibility:    true,
    blockKeyDetection:  false,
    blockMouseLeave:    true,
    blockResize:        true,
    blockIdle:          true,
    blockTimers:        true,
    blockBattery:       true,
    blockNetwork:       true,
    blockPointerLock:   true,
    blockPageLifecycle: true,
    blockFullscreen:    true,
    fakeHeartbeat:      true,
    unlockClipboard:    true,
  },
});

// ─── Mensagens (background ↔ content) ────────────────────────────────────────

const MSG = Object.freeze({
  // Token
  TOKEN:             'TOKEN',

  // M3U8
  M3U8_DETECTED:     'M3U8_DETECTED',

  // Cogna
  COGNA_URL_FOUND:   'COGNA_URL_FOUND',

  // Focus Freeze
  FF_GET_STATE:      'FF_GET_STATE',
  FF_SET_STATE:      'FF_SET_STATE',
  FF_GET_STATS:      'FF_GET_STATS',
  FF_RESET_STATS:    'FF_RESET_STATS',
  FF_APPLY_CONFIG:   'FF_APPLY_CONFIG',
  FF_STAT_INCREMENT: 'FF_STAT_INCREMENT',
  FF_PING:           'FF_PING',
  FF_PONG:           'FF_PONG',
});
