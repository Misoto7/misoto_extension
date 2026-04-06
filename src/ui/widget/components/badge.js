/**
 * @file src/ui/widget/components/badge.js
 * @description Componente de badge/contador para o widget Misoto.
 */

'use strict';

/**
 * Cria um badge inline (ex: contadores de sucesso/erro).
 *
 * @param {Object} opts
 * @param {string} opts.label    - Prefixo do badge
 * @param {string} opts.value    - Valor inicial
 * @param {string} [opts.color]  - Cor do valor
 * @returns {{ root: HTMLElement, update: (value: string) => void }}
 */
function createBadge({ label, value = '0', color = '#a3e635' } = {}) {
  const root = document.createElement('div');
  Object.assign(root.style, {
    display:    'flex',
    alignItems: 'center',
    gap:        '5px',
    fontSize:   '10px',
  });

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.color = '#6b7280';

  const valueEl = document.createElement('span');
  valueEl.textContent  = value;
  valueEl.style.color  = color;
  valueEl.style.fontWeight = '700';
  valueEl.style.fontVariantNumeric = 'tabular-nums';

  root.append(labelEl, valueEl);

  return {
    root,
    update(newValue) {
      valueEl.textContent = String(newValue);
    },
    setColor(newColor) {
      valueEl.style.color = newColor;
    },
  };
}

/**
 * Cria uma linha de dados (label: valor) para a área de dados do widget.
 *
 * @param {string} label
 * @param {string} [value]
 * @param {string} [color]
 * @returns {{ root: HTMLElement, update: (v: string) => void }}
 */
function createDataRow(label, value = 'N/A', color = '#94a3b8') {
  const row = document.createElement('div');
  Object.assign(row.style, {
    display:         'flex',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         '3px 0',
    borderBottom:    '1px solid #ffffff08',
    fontSize:        '10px',
    gap:             '8px',
  });

  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.color = '#4b5563';
  lbl.style.flexShrink = '0';

  const val = document.createElement('span');
  val.textContent    = value;
  val.style.color    = color;
  val.style.fontFamily     = '"Courier New", monospace';
  val.style.fontSize       = '9.5px';
  val.style.textAlign      = 'right';
  val.style.wordBreak      = 'break-all';

  row.append(lbl, val);

  return {
    root: row,
    update(newValue, newColor) {
      val.textContent = String(newValue ?? 'N/A');
      if (newColor) val.style.color = newColor;
    },
  };
}
