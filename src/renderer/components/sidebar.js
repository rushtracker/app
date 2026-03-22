export default class Sidebar {
    #btn;

    constructor(onViewCurrent) {
        this.#btn = document.getElementById('btn-current');

        this.#btn.addEventListener('click', () => onViewCurrent());
    };

    setActive(active) {
        this.#btn.classList.toggle('active', active);
    };
};