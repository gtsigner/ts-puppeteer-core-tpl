const consola = require('consola');

export class Logger {
    private readonly tag: string = "";

    constructor(tag: string) {
        this.tag = tag;
    }

    error(message: any, ...args: any[]) {
        consola.error(`${this.tag} - ${message}`, ...args);
    }

    info(message: any, ...args: any[]) {
        consola.info(`${this.tag} - ${message}`, ...args);
    }

    success(message: any, ...args: any[]) {
        consola.success(`${this.tag} - ${message}`, ...args);
    }
}
