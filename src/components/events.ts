import {TaskConfig} from "../index";

const EventEmitter = require('events');

export class TicketEmitter extends EventEmitter {
    protected readonly config: TaskConfig;

    constructor(config: TaskConfig) {
        super();
        this.config = config;
    }
}

export enum EventTypes {

}
