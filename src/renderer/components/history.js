import { formatDate } from './utils.js';

export default class History {
    #el;

    constructor(onSelect, onContextMenu) {
        this.#el = document.getElementById('history-cards');

        this.#el.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;

            const id = card.dataset.id;
            onSelect(id === 'current' ? 'current' : Number(id));
        });

        this.#el.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;

            const id = card.dataset.id;
            onContextMenu(e, id === 'current' ? 'current' : Number(id));
        });
    };

    render(game, games, viewingGameId) {
        let html = '';

        if (game.started) {
            html += `
                <div class="card current ${viewingGameId === null ? 'selected' : ''}" data-id="current">
                    <div class="card-top">
                        <span class="card-title">${game.mode?.label || '—'}</span>
                        <span class="badge yellow">en cours</span>
                    </div>
                </div>
            `;
        };

        for (const g of games) {
            const modeLabel = g.mode?.label || '—';
            
            let resultLabel;
            let resultClass;

            if (g.spectator) {
                const resultLabels = {
                    blue: 'bleu',
                    red: 'rouge'
                };

                resultLabel = resultLabels[g.winner] || '—';
                resultClass = g.winner               || 'muted';
            } else {
                const resultLabels = {
                    win: 'victoire',
                    loose: 'défaite',
                    draw: 'égalité'
                };
                const resultClasses = {
                    win: 'green',
                    loose: 'red'
                };

                resultLabel = resultLabels[g.state]  || 'inconnu';
                resultClass = resultClasses[g.state] || 'muted';
            };

            html += `
                <div class="card ${viewingGameId === g.id ? 'selected' : ''}" data-id="${g.id}">
                    <div class="card-top">
                        <span class="card-title">${modeLabel}</span>
                        <span class="card-date">${formatDate(g.id)}</span>
                    </div>
                    <div class="card-bottom">
                        <span class="card-sub ${resultClass}">${resultLabel}</span>
                        <span class="card-time">${g.duration || '—'}</span>
                    </div>
                </div>
            `;
        }

        this.#el.innerHTML = html || '<div class="history-empty">aucune partie enregistrée</div>';
    };
};