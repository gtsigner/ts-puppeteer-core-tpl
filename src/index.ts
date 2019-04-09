import {ConfigInfo, ConfigService} from "./services/config";

const puppeteer = require('puppeteer-core');
const path = require('path');
const qs = require('qs');
const cheerio = require('cheerio');
import {TicketHelper} from "./services/ticket";

const FormData = require('form-data');

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
    // ticket: {
    //     eventDetail: number,//售票ID
    //     performanceDetail: number,//场次
    //     areaCode: number,//门票区段及序列号
    //     ticketTypeAndNum: [{ index: number, count: number }, { index: number, count: number }],//门票类别及购买数量
    //     isAdjacent: number,//是否相邻
    //     surname: string, //姓
    //     name: string, //名
    //     email: string, //邮件
    //     getType: number, //领取方式
    //     payCode: number,//付款方法序号
    //     cardCode: string, //卡号
    //     safeCode: string, //安全码
    //     validity: string, //有效期
    // }
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

        await page.setUserAgent(TicketHelper.UserAgent);
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
            //https://ticket.urbtix.hk/internet/zh_TW/secure/event/38166/performanceDetail/370011
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
                const tick: any = {
                    isExpressPurchase: true,
                    isAdjacentSeat: true,
                    isWheelchair: false,
                    isWheelChairTicketType: true,
                    priceZoneId: '',
                    ticketTypeQuantityList: [],
                };
                const res = await this.ticket.request({
                    method: 'GET',
                    url: `http://ticket.urbtix.hk/internet/secure/event/${this.task.config.ticketId}/performanceDetail/${this.task.config.dateId}`
                });

                //@ts-ignore
                await page.evaluate(() => {
                    document.querySelectorAll('.ticket-quota-select').forEach((item) => {
                        //@ts-ignore
                        item.value = 1
                    });
                });
                const btn = await page.$('#express-purchase-btn');
                await btn.click();
                return false;
                if (res.ok) {
                    const $ = cheerio.load(res.data);
                    $('#performanceSelectForm input').each((ix, elem) => {
                        const item = {
                            idx: ix,
                            name: elem.attribs.name,
                            value: elem.attribs.value,
                            type: elem.attribs.type
                        };
                        if (item.type === 'hidden' && item.name.length === 'ZQZbuJ4ftO'.length) {
                            tick.token = {key: item.name, value: item.value};
                        }
                        if (item.name && item.type === 'hidden' && item.value) {
                            tick[item.name] = item.value;
                        }
                    });

                    //选择
                    const types = [];
                    let prId = '';
                    $('#ticket-price-tbl input.pricezone-radio-input').each((ix, elem) => {
                        types.push(elem.attribs.value);
                        prId = elem.attribs.name;
                    });
                    tick.typeId = {
                        key: prId,
                        value: types[this.task.config.type]
                    };

                    //performanceId
                    const performanceId = $('input[name=performanceId]').val();
                    tick.performanceId = performanceId;


                    //2.获取结果
                    const uu = `http://ticket.urbtix.hk/internet/json/performance/${performanceId}/pricezone/${tick.typeId.value}/ticketType.json?locale=zh_TW&1554751661517`;
                    const ret = await this.ticket.request({
                        method: 'GET',
                        url: uu
                    });
                    if (ret.ok) {
                        ret.data.ticketTypeList.forEach((tpl, idx) => {
                            tick.ticketTypeQuantityList.push({
                                ticketTypeId: tpl.ticketTypeId,
                                quantity: 1//默认先一张
                            });
                        });
                    }
                    const body = {
                        performanceId: tick.performanceId,
                        isExpressPurchase: tick.isExpressPurchase,
                        isAdjacentSeat: tick.isAdjacentSeat,
                        isWheelchair: tick.isWheelchair,
                        isWheelChairTicketType: tick.isWheelChairTicketType,
                        priceZoneId: '',
                        //priceZoneId: '',
                    };
                    body[tick.token.key] = tick.token.value;
                    body[tick.typeId.key] = tick.typeId.value;
                    tick.ticketTypeQuantityList.forEach((qu, ix) => {
                        body[`ticketTypeQuantityList[${ix}].ticketTypeId`] = qu.ticketTypeId;
                        body[`ticketTypeQuantityList[${ix}].quantity`] = qu.quantity;
                    });


                    //3.提交订单
                    let res3 = await this.ticket.request({
                        method: 'POST',
                        //https://ticket.urbtix.hk/internet/secure/form/performanceSelect/event/38166/performance/370011
                        url: `http://ticket.urbtix.hk/internet/secure/form/performanceSelect/event/${this.task.config.ticketId}/performance/${this.task.config.dateId}`,
                        data: qs.stringify(body),
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            Host: "ticket.urbtix.hk",
                            Origin: "https://ticket.urbtix.hk",
                            "Upgrade-Insecure-Requests": 1,
                            Referer: `https://ticket.urbtix.hk/internet/zh_TW/secure/event/${this.task.config.ticketId}/performanceDetail/${this.task.config.dateId}`
                        },
                        //cookieStr: `recentlyViewedEvents=${this.task.config.ticketId}:${Date.now()}; `,
                        maxRedirects: 0,
                        timeout: 5000
                    });
                    console.log(body, res3);
                }
                //1.获取类型价格
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
        return page;
    }

    //买票
    async buyTicket(page) {
        await page.evaluate((config) => {
            console.log(config);
            //门票之区段及票价
            const tr_price = document.querySelectorAll("#ticket-price-tbl tbody tr")[config.type - 1];
            //@ts-ignore
            tr_price.querySelectorAll("td")[1].querySelector(".pricezone-radio-input").click();

            //门票类别及数量
            const tr_type_arr = document.querySelectorAll("#ticket-type-tbl tbody tr");
            // for (var i = 0; i < this.task.config.tickets.length; i++) {
            //     const ticket=
            //     tr_type_arr[this.task.tickets.ticketTypeAndNum[i].index].querySelectorAll("td")[1].querySelector("select").selectedIndex = this.task.tickets.ticketTypeAndNum[i].count;
            // }

            //是否连坐
            //@ts-ignore
            document.querySelector("#adjacent-seats-chk").checked = config.ticket.site === 1;

            //点击确认
            //@ts-ignore
            document.querySelector("#express-purchase-btn").click();

            //点击加入购物篮
            //@ts-ignore
            document.querySelector(".ticket-review-confirm-btn div").click();

            //点击下一步
            //@ts-ignore
            document.querySelector("#checkout-btn div").click();

            //填写信息
            //@ts-ignore
            document.querySelector("#input-surname").value = config.xing;//姓
            //@ts-ignore
            document.querySelector("#input-first-name").value = config.ming;//名
            //@ts-ignore
            document.querySelector("#input-email").value = config.email;//邮箱
            //@ts-ignore
            document.querySelector("#delivery-method-select").selectedIndex = config.cash.method;//领取方式
            //@ts-ignore
            document.querySelector("#payment-type-select").selectedIndex = config.card.type;//支付方式
            //@ts-ignore
            document.querySelector("#input-card-number").value = config.card.no;//卡号
            //@ts-ignore
            document.querySelector("#input-security-code").value = config.card.code;//安全码
            //@ts-ignore
            document.querySelector("#payment-expiry-month-select").selectedIndex = config.card.date.split("-")[1];//月
            //@ts-ignore
            document.querySelector("#payment-expiry-year-select").selectedIndex = (config.card.date.split("-")[0] + 1 - new Date().getFullYear());//年

            //继续
            //@ts-ignore
            document.querySelector("#button-confirm").click();

            //已阅读
            //@ts-ignore
            document.querySelector("#checkbox-tnc").checked = true;

            //确认
            //@ts-ignore
            document.querySelector("#button-confirm").click();
        }, this.task.config);
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
                userAgent: TicketHelper.UserAgent
            },
            url: "http://busy.urbtix.hk/redirect.html"
        };
        const tasker = new PageTask(browser, options, task, ticket);
        await tasker.startLogin();

    });
})();
