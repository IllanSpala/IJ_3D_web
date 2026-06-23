/* ═══════════════════════════════════════════════════════════════
   IJ 3D Web — utils.js
   Constants, formatters, and shared helpers.
   ═══════════════════════════════════════════════════════════════ */

export const TAXAS_PLATAFORMA = {
    'Shopee':        0.18,
    'Mercado Livre': 0.15,
    'OLX':           0.10,
    'Direto':        0.0,
};

/**
 * Format a number as BRL currency.
 * @param {number} val
 * @returns {string} e.g. "R$ 12,50"
 */
export function formatBRL(val) {
    if (val == null || isNaN(val)) return 'R$ 0,00';
    return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
}

/**
 * Format a date string (ISO or DD/MM/YYYY) for display.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Already DD/MM/YYYY?
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    // ISO format YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

/**
 * Format peso with unit.
 * @param {number} val grams
 * @returns {string}
 */
export function formatWeight(val) {
    if (val == null || isNaN(val) || val === 0) return '—';
    return `${Number(val).toFixed(1)} g`;
}

/**
 * Map status strings to badge CSS class names.
 */
export function statusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'ativo') return 'badge-active';
    if (s === 'arquivado') return 'badge-archived';
    if (s === 'esgotado' || s === 'esgotados') return 'badge-depleted';
    if (s === 'sucesso') return 'badge-success';
    if (s === 'falha') return 'badge-fail';
    if (s === 'cancelado') return 'badge-fail';
    if (s === 'refazer' || s === 'remake') return 'badge-remake';
    return '';
}

/**
 * Escape HTML entities to prevent XSS.
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Create a placeholder image data URL (dark gray).
 */
export function placeholderImg() {
    return 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
            <rect fill="#1a1a1a" width="80" height="80" rx="8"/>
            <text x="40" y="44" text-anchor="middle" fill="#444" font-size="24">📷</text>
        </svg>`
    );
}
