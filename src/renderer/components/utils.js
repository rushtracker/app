export const kd = (k, d) => d === 0 ? k.toFixed(2) : (k / d).toFixed(2);

export function fmtPoints(n) {
    if (!n) return '0';

    const suffixes = ['', 'K', 'M'];
    const i        = Math.floor(Math.log(n) / Math.log(1000));

    return `${parseFloat((n / Math.pow(1000, i)).toFixed(1))}${suffixes[i]}`;
};

export function fmtTime(seconds) {
    return `${Math.floor(seconds / 3600)}`;
};

export function formatDate(ts) {
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};