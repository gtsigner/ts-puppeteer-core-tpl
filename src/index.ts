import {sleep} from "./utils/system";
import {bound} from "nexe/lib/util";

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ROOT_PATH = path.join(process.cwd());
const config = {
    temp_path: path.join(ROOT_PATH, "temp/")
};
const html = fs.readFileSync(path.join(__dirname, "../config", "index.html")).toString();

export interface LoginParams {
    host: string,
    url: string,
    referer: string,
    cookie: string
}

export interface TaskConfig {
    url: string,
    ticket: {
        url: string
    }
}


export class PageTask {
    private readonly options: any = null;
    private readonly task: TaskConfig = null;
    private readonly browser: any = null;

    constructor(browser, options: any, task: TaskConfig) {
        this.options = options;
        this.browser = browser;
        this.task = task;
    }

    async startLogin() {
        const browser = this.browser;
        const options = this.options;
        const page = await browser.newPage();
        await page.setUserAgent(options.browser.userAgent);
        await page.setViewport({
            height: 1200,
            width: 1200
        });

        //绑定事件
        page.on('load', async () => {
        });
        //页面
        page.on('domcontentloaded', async () => {
            console.log("domcontentloaded");
            const type = page.$("input[name=memberType]");
            const url = page.url();
            console.log(url)
            //内部的选票页面，https://ticket.urbtix.hk/internet/secure/event/38096/performanceDetail/369840
            //type.click();
        });
        //console
        page.on('console', async (msg) => {
            if (msg._type === 'debug') {
                const data = JSON.parse(msg._text);

            }
        });
        //1.进入首页
        await page.goto(options.url);
        //2.进入售票页面,这个页面会生成Cookie
        await page.goto("http://www.urbtix.hk");
        //3.买票的页面
        await page.goto(this.task.ticket.url);
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
        //@ts-ignore
        await page.evaluate(() => {
            const type = document.querySelector("input[name=memberType]");
            // @ts-ignore
            type.click();
        });
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
                width: 800
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

    const tasks: TaskConfig[] = [
        {
            url: "http://busy.urbtix.hk/redirect.html",
            ticket: {
                url: "https://ticket.urbtix.hk/internet/login/transaction?saveRequestUrl=/secure/event/38096/performanceDetail/369840"
            }
        }
    ];
    tasks.forEach(async (task) => {
        const browser = await Creator.createBrowser();
        const options = {
            browser: {
                userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:52.9) Goanna/4.1 (Pale Moon)'
            },
            url: "http://busy.urbtix.hk/redirect.html"
        };
        const tasker = new PageTask(browser, options, task);
        await tasker.startLogin();
    })

})();
