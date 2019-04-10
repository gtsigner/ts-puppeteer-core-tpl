import {ConfigInfo, ConfigService} from "./services/config";


import {TicketHelper} from "./components/ticket";
import {Task} from "./components/task";
import {TICKET_URLS, UrlHelper} from "./services/url";
import {Creator} from "./components/creator";
import {TicketEmitter} from "./components/events";
import {Logger} from "./utils/logger";


const consola = require('consola');

export interface LoginParams {
    host: string,
    url: string,
    referer: string,
    cookie: string
}

export interface TaskConfig {
    url: string,
    config: ConfigInfo,
    cookie: {
        maxCount: number,
    },
    emitter: TicketEmitter,
    tag?: string,
    logger?: Logger,
}


(async () => {

    //然后执行一个脚本，这个脚本是一个表单
    //Post 这四个地址
    //Referer
    //Origin
    //Host
    //Cookie
    const tasks: TaskConfig[] = [];
    const content: string = await ConfigService.getFileContent(ConfigService.filename);
    const config = ConfigService.parseTaskConfig(content);
    config.forEach((cf) => {
        const task: TaskConfig = {
//            url: UrlHelper.parse(TICKET_URLS.login_redirect, cf.ticketId, cf.dateId).toString(),
            url: UrlHelper.parse(TICKET_URLS.login_detail, cf.ticketId).toString(),
            config: cf,
            cookie: {
                maxCount: 100
            },
            emitter: null
        };
        task.emitter = new TicketEmitter(task);
        tasks.push(task);
    });

    tasks.forEach(async (task) => {
        const tag = `任务[${task.config.ticketId}-${task.config.dateId} 未登录]`;
        const logger = new Logger(tag);
        task.tag = tag;
        logger.info(`开始买票任务:${task.config.ticketId},最高执行:${task.cookie.maxCount}次`);
        const ticket = TicketHelper.createInstance();
        //1.获取token
        const token = await ticket.getAuthToken(task.cookie.maxCount);
        if (token.success === false) {
            logger.error(`买票任务:${task.config.ticketId}执行失败,原因:获取auth cookie失败`);
            return false;
        }
        //2.访问首页
        const cks = await ticket.getInternet(task.cookie.maxCount);
        if (cks.success === false) {
            logger.error(`买票任务:${task.config.ticketId}执行失败,原因:获取 sessionId 失败`);
            return false;
        }
        //访问首页不是必要的API
        // const tick = await ticket.getTicketDetail(task.config, task.cookie.maxCount);
        // if (tick.success === false) {
        //     consola.error(`买票任务:${task.config.ticketId}详情执行失败,原因:获取cookie失败`);
        //     return false;
        // }

        const machineCheck = false;
        if (machineCheck === false) {
            logger.error(`机器识别接口未开发,请期待自动话识别功能.....`);
        } else {
            await ticket.autoLogin(task.url);
        }
        //这里面携带了Cookie
        const browser = await Creator.createBrowser();
        const options = {
            browser: {
                cookie: ticket.getCookiesStr(),
                userAgent: TicketHelper.UserAgent
            },
            url: "http://busy.urbtix.hk/redirect.html"
        };
        const tasker = new Task(browser, options, task, ticket);
        //对cookie进行验证码识别，识别成功后推送一个事件，然后再进行购票
        await tasker.bindEvents();
        await tasker.startLogin();

    });
})();
