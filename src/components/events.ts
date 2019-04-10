import {TaskConfig} from "../index";

const EventEmitter = require('events');

export class TicketEmitter extends EventEmitter {
    protected readonly config: TaskConfig;

    constructor(config: TaskConfig) {
        super();
        this.config = config;
        this._init();
    }

    private _init() {


    }
}

export enum EventTypes {
    wait_login_page_success,
    login_success,
    action_buy_ticket,//买票

    page_system_err_msg,//系统繁忙了
    page_system_err_busy,//系统繁忙了

    post_cart_fail,//加入购物车失败
    post_cart_success,//加入购物车成功
    post_info_success,//资料填写成功
    post_info_fail,//填写资料失败
    verify_check = 'verify_check',
}
