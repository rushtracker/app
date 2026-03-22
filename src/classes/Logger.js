require('colors');

module.exports = class Logger {
    constructor() {
        this.lengths = {
            separator: 50
        };
    };

    blank() {
        console.log();
    };

    separator() {
        console.log('─'.repeat(this.lengths.separator));
    };

    log(message, date = new Date()) {
        const timestamp = `[${date.toLocaleDateString('fr-FR').replaceAll('/', '-')} ${date.toLocaleTimeString('fr-FR')}]`.gray;

        console.log(`${timestamp} ${message}`);

        return true;
    };
};