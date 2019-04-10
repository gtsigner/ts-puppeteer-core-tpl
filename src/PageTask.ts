import {TicketHelper} from "./components/ticket";
import {LoginParams, TaskConfig} from "./index";
import {TICKET_URLS, UrlHelper} from "./services/url";
import {ConfigService} from "./services/config";

const qs = require('qs');
const consola = require('consola');
const cheerio = require('cheerio');


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


    /**
     * 进行登录
     */
    async verifyLogin() {


        return true;
    }

    async startLogin() {
        const browser = this.browser;
        const options = this.options;
        const page = await browser.newPage();

        await page.setUserAgent(TicketHelper.UserAgent);
        await page.setViewport({
            height: 1080,
            width: 1920
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

            //登录页面 //https://ticket.urbtix.hk/internet/zh_TW/secure/event/38166/performanceDetail/370011
            if (/\/login\/transaction/.test(url)) {
                consola.info('等待登录');
                const type = await page.$("input[name=memberType][value=non_member]");
                if (type) {
                    await type.click();
                }
                return false;
            }
            //确定购票页面，这个页面才会把票信息加入到购物车
            if (/\/expressPurchase/.test(url)) {
                const btn = await page.$('.ticket-review-confirm-btn .btn-outer-blk .btn-inner-blk');
                await btn.click();
                return false;
            }

            //票的详情页面
            if (/\/eventDetail/.test(url)) {
                //尝试进行协议买票
                const choose = await this.chooseTicket(page);
                if (choose) {
                    //await this.requestTicketInfo(page);
                }
                return true;
            }
            //预购2直接跳转到付款信息页面
            if (/\/shoppingCart/.test(url)) {
                //v2
                await this.requestTicketInfo(page);
                return true;
            }
            //这个页面是填写信息的页面，这里我们选择用协议进行填写
            if (/\/mailingPayment/.test(url)) {
                //await this.buyTicket(page);
                await this.requestTicketInfo(page);
                return true;
            }

            //购票页面
            if (/\/secure\/event\/\d+\/performanceDetail\/\d+/.test(url)) {
                //@ts-ignore
                await page.evaluate(() => {
                    alert("咋个？坏了，联系我一下，你看到这个页面表示不正常");
                });
                return false;
            }

            //登录页面
            if (/\/login/.test(url)) {
                await page.screenshot({
                    path: ConfigService.temp + Math.random() + ".png",
                    type: "png",
                    clip: {
                        x: 370,
                        y: 540,
                        width: 260,
                        height: 200,
                    }
                });
            }
        });

        page.on('console', async (msg) => {
            if (msg._type === 'debug') {
                const data = JSON.parse(msg._text);

            }
        });
        //1.买票的页面
        await page.goto(this.task.url);
        return page;
    }


    /**
     * 选票
     */
    private async chooseTicket(page) {
        //协议买票

        const tick: any = {
            isExpressPurchase: true,
            isAdjacentSeat: true,
            isWheelchair: true,
            isWheelChairTicketType: true,
            priceZoneId: '',
            ticketTypeQuantityList: [],
        };
        const res = await this.ticket.request({
            method: 'GET',
            maxRedirects: 0,
            timeout: 5000,
            url: UrlHelper.parse(TICKET_URLS.ticket_choose, this.task.config.ticketId, this.task.config.dateId)
        });

        consola.info('开始进行协议选票:', res.status);
        if (res.ok) {
            const $ = cheerio.load(res.data);
            $('#performanceSelectForm input[type=hidden]').each((ix, elem) => {
                const item = {
                    idx: ix,
                    name: elem.attribs.name,
                    value: elem.attribs.value,
                    type: elem.attribs.type
                };
                if (item.type === 'hidden' && item.value && item.name.length === 'kIWdy1gVrH'.length && item.value.length === 'RX2WroViPhsD5a9yi2j1'.length) {
                    tick.token = {key: item.name, value: item.value};
                }
                if (item.name && item.type === 'hidden' && item.value) {
                    tick[item.name] = item.value;
                }
            });

            //可选择的票
            const types = [];
            let prId = '';
            $('#ticket-price-tbl input.pricezone-radio-input[type=radio]').each((ix, elem) => {
                prId = elem.attribs.name;
                if (elem && elem.attribs && elem.attribs.value) {
                    types.push(elem.attribs.value);
                }
            });
            console.log(`获取票类型:${prId}->`, types);
            tick.typeId = {
                key: prId,
                value: types[this.task.config.type]
            };
            //performanceId
            tick.performanceId = $('input[name=performanceId]').val();

            //2.获取结果
            const ret = await this.ticket.request({
                method: 'GET',
                url: UrlHelper.parse(TICKET_URLS.ticket_price_info, tick.performanceId, tick.typeId.value, Date.now()),
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
                },
                maxRedirects: 0,
                timeout: 5000,
            });
            if (ret.ok === false) {
                console.error(`获取票座位信息失败,无法重试`);
                return false;
            }
            const ticketTypeQuotaList = ret.data.ticketTypeQuotaList;
            tick.isWheelChairTicketType = ret.data.isWheelChairTicketType;
            tick.isWheelchair = ret.data.isAllowExchangeWheelChairTicket;
            //isWheelChairTicketType
            ret.data.ticketTypeList.forEach((tpl, idx) => {
                tick.ticketTypeQuantityList.push({
                    ticketTypeId: tpl.ticketTypeId,
                    quantity: 2//默认先一张
                });
            });
            //<input type="hidden" name="WcTiiH29tu" value="RX2WroViPhsD5a9yi2j1" />
            const body = {
                performanceId: tick.performanceId,
                isExpressPurchase: tick.isExpressPurchase,
                isAdjacentSeat: tick.isAdjacentSeat,
                //isWheelchair: tick.isWheelchair,
                isWheelchair: false,
                isWheelChairTicketType: tick.isWheelChairTicketType,
                priceZoneId: '',
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
                url: UrlHelper.parse(TICKET_URLS.ticket_pre_post, this.task.config.ticketId, this.task.config.dateId),
                data: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    "Cache-Control": "max-age=0",
                    Host: TICKET_URLS.const_ticket_host,
                    Origin: "https://ticket.urbtix.hk",
                    Referer: UrlHelper.parse(TICKET_URLS.ticket_choose, this.task.config.ticketId, this.task.config.dateId),
                    "Upgrade-Insecure-Requests": 1,
                },
                maxRedirects: 0,
                timeout: 15000,//超时
                withCredentials: true,
                transformRequest: [(data, headers) => {
                    return qs.stringify(data);
                }],
            });
            if (res3.status === 200 && /系統未能回應你的要求/.test(res3.data)) {
                console.log(`购票失败：系統未能回應你的要求`, res3.config, body);
                return false;
            }
            //成功
            console.log(`预选票成功，开始验证票:${res3.headers.location}`);
            // if (res3.status === 302 && /\/secure\/process/.test(res3.headers.location)) {
            //
            //     return true;
            // }
            //请求这个页面
            const processRet = await this.ticket.request({
                url: res3.headers.location,
                data: body,
                headers: {
                    Host: TICKET_URLS.const_ticket_host,
                    Origin: "https://ticket.urbtix.hk",
                    Referer: UrlHelper.parse(TICKET_URLS.ticket_choose, this.task.config.ticketId, this.task.config.dateId),
                    "Upgrade-Insecure-Requests": 1,
                },
                maxRedirects: 3,//开启自动location后返回的是200
                timeout: 15000,//超时
                withCredentials: true,
            });
            //跳转资料填写
            if (processRet.status !== 200) {
                console.log(`获取票预览加入购物车页面失败:`, processRet.status);
                return false;
            }
            //解析信息加入购物车
            const shopcart = {};
            //https://ticket.urbtix.hk/internet/secure/form/reviewTicket/event/38138/performance/126083

            const reviewRet = await this.ticket.request({
                //performanceId:
                url: UrlHelper.parse(TICKET_URLS.ticket_form_reviewTicket, this.task.config.ticketId, body.performanceId),
                data: shopcart,
                headers: {
                    Host: TICKET_URLS.const_ticket_host,
                    Origin: "https://ticket.urbtix.hk",
                    Referer: res3.headers.location,
                    "Upgrade-Insecure-Requests": 1,
                },
                maxRedirects: 3,//开启自动location后返回的是200
                timeout: 15000,//超时
                withCredentials: true,
                transformRequest: [(data, headers) => {
                    return qs.stringify(data);
                }],
            });
            console.log(reviewRet);
            return false;
        }

        console.log(`访问购票页面失败`, res.headers);
        return false;
    }

    private async requestTicketInfo(page): Promise<boolean> {
        const body = {
            lastname: "赵",
            firstname: "赵",
            'deliveryInformation.email': '1234@qq.com',
            isReceiveWarmReminder: 'on',//体系
            deliveryMethodId: 106,//领取方法
            'paymentInformation.paymentTypeId': '220',//信用卡
            claimType: 'card',
            'creditCard.cardNumber': '4557291006682110',
            'creditCard.creditCardType': 'VISA',
            'creditCard.securityCode': '396',
            'creditCard.expiryMonth': 5,
            'creditCard.expiryYear': 2019,
        };
        //38052,369889,0,[1=2|2=3],1,赵,俊,1716771371@qq.com,1,1,4557291006682110,396,2019-05
        const res = await this.ticket.request({
            url: TICKET_URLS.ticket_pay_info,
            headers: {
                Referer: "https://ticket.urbtix.hk/internet/zh_TW/secure/mailingPayment"
            }
        });
        if (res.ok) {
            const $ = cheerio.load(res.data);
            $('input[type=hidden]').each((ix, elem) => {
                const name = elem.attribs.name || '';
                if (name.length === '9k0d0qMlSc'.length) {
                    body[name] = elem.attribs.value;
                }
            });
            //提交
            const ret = await this.ticket.request({
                method: 'POST',
                url: 'https://ticket.urbtix.hk/internet/secure/form/mailingPayment',
                data: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: "https://ticket.urbtix.hk/internet/zh_TW/secure/mailingPayment"
                },
                maxRedirects: 0,
                timeout: 5000,
                transformRequest: [(data, headers) => {
                    return qs.stringify(data);
                }],
            });
            if (ret.status == 302) {
                await page.goto(ret.headers.location);
                consola.info(`提交支付信息成功，现在您可以进行订单支付了:${ret.headers.location}`);
                return true;
            }
            return false;
        }
        return false;
    }

    static async login(page: any, login: LoginParams) {
        await page.goto(login.url);
    }

    private async _test() {
        // const processRet = await this.ticket.request({
        //     url: res3.headers.location,
        //     data: body,
        //     headers: {
        //         Host: TICKET_URLS.const_ticket_host,
        //         Origin: "https://ticket.urbtix.hk",
        //         Referer: UrlHelper.parse(TICKET_URLS.ticket_choose, this.task.config.ticketId, this.task.config.dateId),
        //         "Upgrade-Insecure-Requests": 1,
        //     },
        //     //maxRedirects: 0,//开启自动location后返回的是200
        //     timeout: 10000,//超时
        //     withCredentials: true,
        // });
        // //跳转资料填写
        // if (processRet.status === 302 && /\/expressPurchase/.test(processRet.headers.location)) {
        //     console.log(`验证票成功，等待信息填写:${processRet.headers.location}`);
        //     await page.goto(processRet.headers.location);
        //     return true;
        // }
    }
}
