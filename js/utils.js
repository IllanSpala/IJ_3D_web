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
    const str = String(dateStr);
    // Already DD/MM/YYYY?
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    // ISO format YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    return str;
}

/** Convert supported date formats to a sortable timestamp. */
export function dateTimestamp(value) {
    if (!value) return 0;
    const str = String(value).trim();
    const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])).getTime();
    const parsed = Date.parse(str);
    return Number.isNaN(parsed) ? 0 : parsed;
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

/**
 * Compress and resize an image before saving to DB
 * @param {File|Blob} file 
 * @param {number} maxWidth 
 * @param {number} quality 
 * @returns {Promise<Blob>}
 */
export function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // Draw to canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export as WebP
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/webp', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
