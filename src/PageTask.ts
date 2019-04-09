import {TicketHelper} from "./services/ticket";
import {LoginParams, TaskConfig} from "./index";
import {TICKET_URLS, UrlHelper} from "./services/url";

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
            //预购1
            if (/\/expressPurchase/.test(url)) {
                const btn = await page.$('.ticket-review-confirm-btn .btn-outer-blk .btn-inner-blk');
                await btn.click();
                return false;
            }
            //预购2直接跳转到付款信息页面
            if (/\/shoppingCart/.test(url)) {
                //v1
                //await page.goto(TICKET_URLS.ticket_pay_info);
                //其实不用了，我这个地方就可以开始手动进行结算

                //v2
                await this.buyTicketHttp(page);
                return true;
            }
            //订单结算
            if (/\/mailingPayment/.test(url)) {
                await this.buyTicket(page);
                await this.buyTicketHttp(page);
                return false;
            }

            //购票页面
            if (/\/secure\/event\/\d+\/performanceDetail\/\d+/.test(url)) {
                consola.info('开始选择票');
                const tick: any = {
                    isExpressPurchase: true,
                    isAdjacentSeat: true,
                    isWheelchair: false,
                    isWheelChairTicketType: true,
                    priceZoneId: '',
                    ticketTypeQuantityList: [],
                };
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
                const res = await this.ticket.request({
                    method: 'GET',
                    url: UrlHelper.parse(TICKET_URLS.ticket_choose, this.task.config.ticketId, this.task.config.dateId)
                });
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
                        url: uu,
                        headers: {
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
                        }
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
                        url: UrlHelper.parse(TICKET_URLS.ticket_pre_post, this.task.config.ticketId, this.task.config.dateId),
                        data: body,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            "Cache-Control": "max-age=0",
                            Host: "ticket.urbtix.hk",
                            Origin: "https://ticket.urbtix.hk",
                            "Upgrade-Insecure-Requests": 1,
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                            Referer: `https://ticket.urbtix.hk/internet/zh_TW/secure/event/${this.task.config.ticketId}/performanceDetail/${this.task.config.dateId}`
                        },
                        maxRedirects: 0,
                        timeout: 5000,
                        transformRequest: [(data, headers) => {
                            return qs.stringify(data);
                        }],
                    });
                    console.log(body, res3.headers, res3.data);
                }
                //1.获取类型价格
                return;
            }
        });

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
    private async buyTicket(page) {
        return await page.evaluate((config) => {

            //填写信息
            //@ts-ignore
            document.querySelector("#input-surname").value = config.xing;//姓
            //@ts-ignore
            document.querySelector("#input-first-name").value = config.ming;//名
            //@ts-ignore
            document.querySelector("#input-email").value = config.email;//邮箱
            // @ts-ignore
            const reminder = document.querySelector('#isReceiveWarmReminder');
            if (reminder) {
                // @ts-ignore
                reminder.checked = true;
            }
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
            //document.querySelector("#button-confirm").click();

            //确认
            //@ts-ignore
            //document.querySelector("#button-confirm").click();
        }, this.task.config);
    }

    private async buyTicketHttp(page) {
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

            //     lastname: 赵
            //     firstname: 俊
            //     deliveryInformation.email: 1716771371@qq.com
            // isReceiveWarmReminder: on
            // deliveryMethodId: 106
            // paymentInformation.paymentTypeId: 220
            // claimType: card
            // creditCard.cardNumber: 4557291006682110
            // creditCard.creditCardType: VISA
            // creditCard.securityCode: 396
            // creditCard.expiryMonth: 5
            // UV0URpEsO9: mvxI4Q6aRjG2nsTfNV6M
            //'9k0d0qMlSc: 8IUAmhWXhyPGxxkYbmbQ,
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
                consola.info('提交支付信息成功，现在您可以进行订单支付结算了');
                return true;
            }
            return false;
        }
        return true;
    }

    static async login(page: any, login: LoginParams) {
        await page.goto(login.url);
    }
}
