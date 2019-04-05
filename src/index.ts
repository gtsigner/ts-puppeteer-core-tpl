const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, "../config", "index.html")).toString();

export interface LoginParams {
    host: string,
    url: string,
    referer: string,
    cookie: string
}

export class Tasker {
    private readonly options: any = null;
    private readonly browser: any = null;

    constructor(browser, options: any) {
        this.options = options;
        this.browser = browser;
    }

    async run() {
        const browser = this.browser;
        const options = this.options;
        const page = await browser.newPage();
        await page.setUserAgent(options.browser.userAgent);
        await page.setViewport({
            height: 600,
            width: 800
        });

        //绑定事件
        let login: LoginParams = {referer: "", host: "", url: "", cookie: ""};
        let writed = false;
        page.on('load', async () => {
            //在浏览器界面上绘制窗体配置
            if (writed) return;
            writed = true;
            await page.setContent(html, {});
        });
        //console
        page.on('console', async (msg) => {
            if (msg._type === 'debug') {
                const data = JSON.parse(msg._text);
                if (data.action === 'login') {
                    login = {...data};
                    await page.setExtraHTTPHeaders({referer: login.referer, host: login.host, cookie: login.cookie});
                    await Tasker.login(page, login);
                }
            }
        });
        await page.goto('https://www.baidu.com');
    }

    static async login(page: any, login: LoginParams) {
        await page.goto(login.url);
    }
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: path.resolve('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'),
        headless: false,
        defaultViewport: {
            height: 600,
            width: 800
        }
    });
    const options = {
        browser: {
            userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:52.9) Goanna/4.1 (Pale Moon)'
        },
    };
    const tasker = new Tasker(browser, options);
    await tasker.run();


    //然后执行一个脚本，这个脚本是一个表单
    //Post 这四个地址
    //Referer
    //Origin
    //Host
    //Cookie

})();
