/**
 * @file src/ui/widget/components/button.js
 * @description Componente de botão reutilizável para o widget Misoto.
 */

'use strict';

/**
 * Cria um botão estilizado para o widget.
 *
 * @param {Object}   opts
 * @param {string}   opts.label       - Texto do botão
 * @param {string}   [opts.color]     - Cor de destaque (hex)
 * @param {string}   [opts.bg]        - Background CSS
 * @param {boolean}  [opts.full]      - Ocupa 100% da largura
 * @param {boolean}  [opts.disabled]  - Inicia desabilitado
 * @param {Function} [opts.onClick]   - Handler de clique
 * @returns {HTMLButtonElement}
 */
function createButton({ label, color = '#818cf8', bg, full = false, disabled = false, onClick } = {}) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.disabled    = disabled;

  Object.assign(btn.style, {
    padding:       '6px 10px',
    borderRadius:  '6px',
    border:        `1px solid ${color}55`,
    background:    bg ?? `${color}22`,
    color:         disabled ? '#4b5563' : color,
    fontSize:      '11px',
    fontWeight:    '600',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    opacity:       disabled ? '0.5' : '1',
    transition:    'all 0.15s ease',
    userSelect:    'none',
    whiteSpace:    'nowrap',
    ...(full ? { width: '100%' } : {}),
  });

  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) {
      btn.style.background = `${color}44`;
      btn.style.borderColor = color;
    }
  });
  btn.addEventListener('mouseleave', () => {
    if (!btn.disabled) {
      btn.style.background  = bg ?? `${color}22`;
      btn.style.borderColor = `${color}55`;
    }
  });
  btn.addEventListener('mousedown', () => {
    if (!btn.disabled) btn.style.transform = 'scale(0.97)';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.transform = '';
  });

  if (onClick) btn.addEventListener('click', onClick);

  return btn;
}

/**
 * Atualiza o estado visual de um botão (enabled/disabled + rótulo opcional).
 * @param {HTMLButtonElement} btn
 * @param {boolean}           enabled
 * @param {string}            [label]
 * @param {string}            [color]
 */
function setButtonState(btn, enabled, label, color) {
  if (!btn) return;
  btn.disabled      = !enabled;
  btn.style.opacity = enabled ? '1' : '0.5';
  btn.style.cursor  = enabled ? 'pointer' : 'not-allowed';
  if (label) btn.textContent = label;
  if (color) {
    btn.style.color       = enabled ? color : '#4b5563';
    btn.style.borderColor = enabled ? `${color}55` : '#374151';
    btn.style.background  = enabled ? `${color}22` : '#1f293733';
  }
}
