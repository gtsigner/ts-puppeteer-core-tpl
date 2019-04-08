import {ConfigInfo, ConfigService} from "./services/config";

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
import {TicketHelper} from "./services/ticket";

const consola = require('consola');

export interface LoginParams {
    host: string,
    url: string,
    referer: string,
    cookie: string
}

export interface TaskConfig {
    url: string,
    ticket?: {
        url: string
    },
    config: ConfigInfo,
    cookie: {
        maxCount: number,
    }
}


export class PageTask {
    private readonly options: any = null;
    private readonly task: TaskConfig = null;
    private readonly browser: any = null;
    private readonly ticket: TicketHelper = null;

    constructor(browser, options: any, task: TaskConfig, ticket: TicketHelper) {
        this.options = options;
        this.browser = browser;
        this.task = task;
        this.ticket = ticket;
    }

    async startLogin() {
        const browser = this.browser;
        const options = this.options;
        const page = await browser.newPage();


        await page.setUserAgent(options.browser.userAgent);
        await page.setViewport({
            height: 800,
            width: 900
        });
        //cookies
        const cookies = this.ticket.getCookieEntry('', 'ticket.urbtix.hk');
        const res = await Promise.all(cookies.map((ck) => {
            return page.setCookie({name: ck.name, value: ck.value, domain: ck.domain});
        }));
        //绑定事件
        page.on('load', async () => {

        });
        //页面
        page.on('domcontentloaded', async () => {
            const url = page.url();
            console.log('document is  loaded url:' + url);
            //登录页面
            //https://ticket.urbtix.hk/internet/login/transaction?saveRequestUrl=/secure/event/38096/performanceDetail/369840
            if (/internet\/login\/transaction/.test(url)) {
                consola.info('等待登录');
                const type = await page.$("input[name=memberType][value=non_member]");
                if (type) {
                    await type.click();
                }
                return false;
            }
            //购票页面
            if (/internet\/secure\/event/.test(url)) {
                consola.info('开始选择票');
                const res = await this.ticket.request({
                    method: 'GET',
                    url: 'https://ticket.urbtix.hk/internet/secure/event/38096/performanceDetail/369840'
                });
                if (res.ok) {
                    const $ = cheerio.load(res.data);
                }
                console.log(res);
                return;
            }


            // //内部的选票页面，https://ticket.urbtix.hk/internet/secure/event/38096/performanceDetail/369840
            // //type.click();
            //
            // switch (url) {
            //     case 'https://ticket.urbtix.hk/internet/secure/event/38096/performanceDetail/369840':
            //         break;
            // }
        });

        //内页1
        //https://ticket.urbtix.hk/internet/secure/event/38096/performanceDetail/369840


        //console
        page.on('console', async (msg) => {
            if (msg._type === 'debug') {
                const data = JSON.parse(msg._text);

            }
        });
        //1.买票的页面
        await page.goto(this.task.url);
        //5.需要等待图片加载完整后
        // await sleep(1000);
        // await page.screenshot({
        //     path: config.temp_path + Math.random() + ".png",
        //     type: "png",
        //     clip: {
        //         x: 370,
        //         y: 540,
        //         width: 260,
        //         height: 200,
        //     }
        // });
        //6.进入页面注入抢票JS
        return page;
    }

    //买票
    async buyTicket() {

    }

    static async login(page: any, login: LoginParams) {
        await page.goto(login.url);
    }
}


export class Creator {

    constructor() {

    }

    static async createBrowser(): Promise<any> {
        return await puppeteer.launch({
            executablePath: path.resolve('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'),
            headless: false,
            defaultViewport: {
                height: 600,
                width: 800,
                deviceScaleFactor: 1
            }
        });
    }

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
            url: `https://ticket.urbtix.hk/internet/login/transaction?saveRequestUrl=/secure/event/${cf.ticketId}/performanceDetail/${cf.dateId}`,
            config: cf,
            cookie: {
                maxCount: 10
            }
        };
        tasks.push(task);
    });

    tasks.forEach(async (task) => {
        consola.info(`开始买票任务:${task.config.ticketId},最高执行:${task.cookie.maxCount}次`);
        const ticket = TicketHelper.createInstance();
        const token = await ticket.getAuthToken(task.cookie.maxCount);
        if (token.success === false) {
            consola.info(`买票任务:${task.config.ticketId}执行失败,原因:获取auth cookie失败`);
            return false;
        }
        const cks = await ticket.getInternet(task.cookie.maxCount);
        if (cks.success === false) {
            consola.info(`买票任务:${task.config.ticketId}执行失败,原因:获取cookie失败`);
            return false;
        }

        //这里面携带了Cookie
        const browser = await Creator.createBrowser();
        const options = {
            browser: {
                cookie: ticket.getCookiesStr(),
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
            },
            url: "http://busy.urbtix.hk/redirect.html"
        };
        const tasker = new PageTask(browser, options, task, ticket);
        await tasker.startLogin();
    })


})();
