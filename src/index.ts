import {ConfigInfo, ConfigService} from "./services/config";


import {TicketHelper} from "./components/ticket";
import {PageTask} from "./PageTask";
import {TICKET_URLS, UrlHelper} from "./services/url";
import {Creator} from "./components/creator";
import {TicketEmitter} from "./components/events";


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
    emitter: TicketEmitter
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
        consola.info(`开始买票任务:${task.config.ticketId},最高执行:${task.cookie.maxCount}次`);
        const ticket = TicketHelper.createInstance();
        //获取token
        const token = await ticket.getAuthToken(task.cookie.maxCount);
        if (token.success === false) {
            consola.info(`买票任务:${task.config.ticketId}执行失败,原因:获取auth cookie失败`);
            return false;
        }
        //访问首页
        const cks = await ticket.getInternet(task.cookie.maxCount);
        if (cks.success === false) {
            consola.info(`买票任务:${task.config.ticketId}执行失败,原因:获取cookie失败`);
            return false;
        }
        //访问首页
        const tick = await ticket.getTicketDetail(task.config, task.cookie.maxCount);
        if (tick.success === false) {
            consola.info(`买票任务:${task.config.ticketId}详情执行失败,原因:获取cookie失败`);
            return false;
        }
        console.log(ticket.getCookiesStr());

        //这里面携带了Cookie
        const browser = await Creator.createBrowser();
        //await browser.resize({300, 300});
        const options = {
            browser: {
                cookie: ticket.getCookiesStr(),
                userAgent: TicketHelper.UserAgent
            },
            url: "http://busy.urbtix.hk/redirect.html"
        };
        const tasker = new PageTask(browser, options, task, ticket);
        //对cookie进行验证码识别，识别成功后推送一个事件，然后再进行购票
        await tasker.startLogin();

    });
})();
