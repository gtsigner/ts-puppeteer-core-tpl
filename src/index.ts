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
        eventDetail: number,//售票ID
        performanceDetail: number,//场次
        areaCode: number,//门票区段及序列号
        ticketTypeAndNum: [{index:number, count:number}, {index:number, count:number}],//门票类别及购买数量
        isAdjacent: number,//是否相邻
        surname: string, //姓
        name: string, //名
        email: string, //邮件
        getType: number, //领取方式
        payCode: number,//付款方法序号
        cardCode: string, //卡号
        safeCode: string, //安全码
        validity: string, //有效期
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
        await page.goto("https://ticket.urbtix.hk/internet/login/transaction?saveRequestUrl=/secure/event/"+this.task.ticket.eventDetail+"/performanceDetail/"+this.task.ticket.performanceDetail);
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
            const type = document.querySelector(".non-member-radio");
            // @ts-ignore
            type.click();
        });

        //等待输入验证码
        await page.waitFor(() => {
            const td_Arr = document.querySelectorAll("#captcha-image-input-key-selected-container tbody tr td");
            var index = 0;
            td_Arr.forEach((item) => {
                if(item.innerHTML != '') {
                    index++;
                }
                if(index == 4) {
                    //点击登录
                    const loginBtn = document.querySelector(".btn-inner-blk");
                    //@ts-ignore
                    loginBtn.click();
                }
            });
        }, {timeout:1000 * 60 * 60});

        await this.buyTicket(page);

        return page;
    }

    //买票
    async buyTicket(page) {
        console.log("测试");
        await page.evaluate(() => {
            //门票之区段及票价
            const tr_price = document.querySelectorAll("#ticket-price-tbl tbody tr")[this.task.ticket.areaCode-1];
            //@ts-ignore
            tr_price.querySelectorAll("td")[1].querySelector(".pricezone-radio-input").click();

            //门票类别及数量
            const tr_type_arr = document.querySelectorAll("#ticket-type-tbl tbody tr");
            for (var i=0; i<this.task.ticket.ticketTypeAndNum.length; i++) {
                tr_type_arr[this.task.ticket.ticketTypeAndNum[i].index].querySelectorAll("td")[1].querySelector("select").selectedIndex = this.task.ticket.ticketTypeAndNum[i].count;
            }

            //是否连坐
            //@ts-ignore
            document.querySelector("#adjacent-seats-chk").checked = this.task.ticket.isAdjacent == 1 ? true : false;

            //点击确认
            //@ts-ignore
            document.querySelector("#express-purchase-btn").click()

            //点击加入购物篮
            //@ts-ignore
            document.querySelector(".ticket-review-confirm-btn div").click();

            //点击下一步
            //@ts-ignore
            document.querySelector("#checkout-btn div").click();

            //填写信息
            //@ts-ignore
            document.querySelector("#input-surname").value = this.task.ticket.surname;//姓
            //@ts-ignore
            document.querySelector("#input-first-name").value = this.task.ticket.surname;//名
            //@ts-ignore
            document.querySelector("#input-email").value = this.task.ticket.email;//邮箱
            //@ts-ignore
            document.querySelector("#delivery-method-select").selectedIndex = this.task.ticket.getType;//领取方式
            //@ts-ignore
            document.querySelector("#payment-type-select").selectedIndex = this.task.ticket.payCode;//支付方式
            //@ts-ignore
            document.querySelector("#input-card-number").value = this.task.ticket.cardCode;//卡号
            //@ts-ignore
            document.querySelector("#input-security-code").value = this.task.ticket.safeCode;//安全码
            //@ts-ignore
            document.querySelector("#input-security-code").value = this.task.ticket.safeCode;//安全码
            //@ts-ignore
            document.querySelector("#payment-expiry-month-select").selectedIndex = this.task.ticket.validity.split("-")[1];//月
            //@ts-ignore
            document.querySelector("#payment-expiry-year-select").selectedIndex = (this.task.ticket.validity.split("-")[0]+1 - new Date().getFullYear());//年

            //继续
            //@ts-ignore
            document.querySelector("#button-confirm").click();

            //已阅读
            //@ts-ignore
            document.querySelector("#checkbox-tnc").checked = true;

            //确认
            //@ts-ignore
            document.querySelector("#button-confirm").click();
        });
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
                eventDetail: 38096,//售票ID
                performanceDetail: 369840,//场次
                areaCode: 2,//门票区段及序列号
                ticketTypeAndNum: [
                    {
                        index:1,
                        count:2,
                    },
                    {
                        index:2,
                        count:1,
                    }
                ],//门票类别及购买数量
                isAdjacent: 2,//是否相邻
                surname: '曾', //姓
                name: '疑难', //名
                email: '498338021@qq.com', //邮件
                getType: 1, //领取方式
                payCode: 1,//付款方法序号
                cardCode: '231232132132132', //卡号
                safeCode: '0212', //安全码
                validity: '2019-08', //有效期
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
        const page = await tasker.startLogin();
        //await tasker.buyTicket(page);
    })

})();
