import {TicketHelper} from "./ticket";
import {LoginParams, TaskConfig} from "..";
import {TICKET_URLS, UrlHelper} from "../services/url";
import {ConfigService} from "../services/config";
import {EventTypes} from "./events";
import {Logger} from "../utils/logger";

const qs = require('qs');
const cheerio = require('cheerio');


export interface TaskReturn {
    ok: boolean,
    retry: boolean,//是否重试
    message: string,
    delay?: number,//延迟
    data?: any
}

export class Task {
    private readonly options: any = null;
    private readonly task: TaskConfig = null;
    private readonly browser: any = null;
    private readonly ticket: TicketHelper = null;
    private readonly emitter = null;
    private page = null;
    private readonly logger: Logger = null;
    private readonly tag: string = '任务';

    constructor(browser, options: any, task: TaskConfig, ticket: TicketHelper) {
        this.options = options;
        this.browser = browser;
        this.task = task;
        this.ticket = ticket;
        this.emitter = this.task.emitter;
        this.tag = `任务[${task.config.email}-${task.config.ticketId}-已授权]`;
        this.logger = new Logger(this.tag);
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
        this.page = page;
        //cookies
        const cookies = this.ticket.getCookieEntry('', 'ticket.urbtix.hk');
        //设置Cookies
        await Promise.all(cookies.map((ck) => {
            return page.setCookie({name: ck.name, value: ck.value, domain: ck.domain});
        }));

        //绑定事件
        page.on('load', async () => {

        });

        //页面
        page.on('domcontentloaded', async () => {
            const url = page.url();
            if (ConfigService.debug) {
                this.logger.info('document is  loaded url:' + url);
            }
            if (/msg\.urbtix\.hk/.test(url)) {
                this.emitter.emit(EventTypes.page_system_err_msg);
                //想都不用想，直接跳到
                await page.goto(this.task.url);
                return false;
            }

            //登录页面 //https://ticket.urbtix.hk/internet/zh_TW/secure/event/38166/performanceDetail/370011
            if (/\/login\/transaction/.test(url)) {
                this.logger.info('等待登录输入验证码中');
                const type = await page.$("input[name=memberType][value=non_member]");
                if (type) {
                    await type.click();
                }
                this.emitter.emit(EventTypes.wait_login_page_success);
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
                this.emitter.emit(EventTypes.login_success);
                page.evaluate(() => {
                    alert("系统进行自动抢票,请稍等会儿哈");
                });
                return true;
            }
            //预购2直接跳转到付款信息页面
            if (/\/shoppingCart$/.test(url)) {
                await this.requestTicketInfo();
                return true;
            }
            //这个页面是填写信息的页面，这里我们选择用协议进行填写
            if (/\/mailingPayment/.test(url)) {
                await this.requestTicketInfo();
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

            if (/\/transactionPreview/.test(url)) {
                await page.evaluate(() => {
                    //@ts-ignore
                    $('#checkbox-tnc').click();
                    alert("我是故意跳出来吓唬你的,怕不怕？？？");
                });
                return true;
            }
        });

        page.on('console', (msg) => {
            if (msg._type === 'debug') {
                const data = JSON.parse(msg._text);
                this.emitter.emit(data.event, data.data);
            }
        });

        //1.买票的页面
        await page.goto(this.task.url);
        return page;
    }

    async bindEvents() {
        const emitter = this.emitter;

        //验证码自动识别
        this.emitter.on(EventTypes.verify_check, async (data) => {
            //1.携带Cookie访问验证码，https://ticket.urbtix.hk/internet/1554887998481/captchaImage.jpeg
            //2.直接访问这个JSON,进行图片下载和进行识别。https://ticket.urbtix.hk/internet/captchaImage/1554887970343/inputKey.json

            //https://ticket.urbtix.hk/internet/j_spring_security_check
            //

            console.log(data);
        });

        //登录成功
        this.emitter.on(EventTypes.login_success, async () => {
            this.emitter.emit(EventTypes.action_buy_ticket);
        });

        //买票
        this.emitter.on(EventTypes.action_buy_ticket, async () => {
            const res = await this.getShopCart();
            if (false === res.empty && res.error === false) {
                //清空购物车或者直接进行结算就行了
                this.logger.info(`购物车不是空的，直接进行付款购买`);
                emitter.emit(EventTypes.post_cart_success);
                return;
            }
            const choose = await this.chooseTicket();
            if (choose) {
                emitter.emit(EventTypes.post_cart_success);
            } else {
                emitter.emit(EventTypes.post_cart_fail);
            }
        });

        this.emitter.on(EventTypes.post_cart_fail, async () => {
            this.logger.error(`买票失败了,几秒后重试`);
            setTimeout(() => {
                //重试
                emitter.emit(EventTypes.action_buy_ticket);
            }, 2000);
        });

        //买票成功开始填写信息
        this.emitter.on(EventTypes.post_cart_success, async () => {
            const res = await this.requestTicketInfo();

        });

        /**
         * 信息填写失败重新买票
         */
        this.emitter.on(EventTypes.post_info_fail, async (res) => {
            this.logger.error(`信息填写失败了,2秒后重试买票`);
            setTimeout(() => {
                emitter.emit(EventTypes.action_buy_ticket);
            }, 2000);
        });

        //提交个人信息成功
        this.emitter.on(EventTypes.post_info_success, async (res: TaskReturn) => {
            this.logger.info(`提交支付信息成功，请付款去：${res.data.location}`);
            await this.page.goto(res.data.location);
        });
    }

    /**
     * 选票
     */
    private async chooseTicket() {
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
        this.logger.success('开始进行协议购票:', res.status);
        if (res.ok === false) {
            console.log(`访问购票页面失败`, res.headers);
            return false;
        }
        let $ = cheerio.load(res.data);
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
        this.logger.success(`获取票区段列表:${prId}->${JSON.stringify(types)},`);
        tick.typeId = {
            key: prId,
            value: types[this.task.config.type]//索引
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
        //票的最大数量
        const ticketTypeQuotaList = ret.data.ticketTypeQuotaList;
        tick.isWheelChairTicketType = ret.data.isWheelChairTicketType;
        tick.isWheelchair = ret.data.isAllowExchangeWheelChairTicket;
        //解析票的信息
        ret.data.ticketTypeList.forEach((tpl, idx) => {
            const cc = ticketTypeQuotaList[idx];
            this.task.config.tickets.forEach((cnf) => {
                if (cnf.key !== idx) return false;
                this.logger.info(`购买票[ ${cnf.key} - ${tpl.ticketTypeName} ]的目标数量:${cnf.count} 余：${cc}`);
                if (cc === 0) return false;//没得票了
                tick.ticketTypeQuantityList.push({
                    ticketTypeId: tpl.ticketTypeId,
                    quantity: cnf.count > cc ? cc : cnf.count//最多买多少票
                });
            });
        });
        if (tick.ticketTypeQuantityList.length === 0) {
            this.logger.error(`购票失败，当前没有任何可以进行购买的票数据，稍后试一试吧`);
            this.emitter.emit('no_ticket');
            await this.close();
            return false;
        }
        const body = {
            performanceId: tick.performanceId,
            isExpressPurchase: tick.isExpressPurchase,
            isAdjacentSeat: tick.isAdjacentSeat,
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
            maxRedirects: 0,//后面手动处理
            timeout: 10000,//超时
            withCredentials: true,
            transformRequest: [(data, headers) => {
                return qs.stringify(data);
            }],
        });
        if (res3.status === 200 && /系統未能回應你的要求/.test(res3.data)) {
            this.logger.error(`购票失败：系統未能回應你的要求`, res3.config, body);
            return false;
        }
        if (/\error\/systemError/.test(res3.headers.location)) {
            this.logger.error(`购票失败：提交订单遇到系统错误:${res3.headers.location}`);
            return false;
        }
        //成功
        this.logger.success(`预选票成功，等待加入预览页面模拟预览:${res3.headers.location}`);
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
            maxRedirects: 2,//开启自动location后返回的是200
            timeout: 15000,//超时
            withCredentials: true,
        });
        //跳转资料填写，expressPurchase
        if (processRet.status !== 200) {
            this.logger.error(`获取票预览加入购物车页面失败:`, processRet.status);
            return false;
        }
        const $p = cheerio.load(processRet.data);
        const shopcart: any = {};
        $p('#reviewTicketForm input').each((ix, elem) => {
            const name = elem.attribs.name || '';
            const value = elem.attribs.value;
            if (name !== '') {
                shopcart[name] = value;
            }
            if (/seatTicketTypeList\[(\d+)\].currentTicketTypeId/.test(name)) {
                shopcart[name.replace(/currentTicketTypeId/g, 'newTicketTypeId')] = value;
            }
        });

        const reviewRet = await this.ticket.request({
            //performanceId:
            method: 'POST',
            url: UrlHelper.parse(TICKET_URLS.ticket_form_reviewTicket, this.task.config.ticketId, body.performanceId),
            data: shopcart,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                "Cache-Control": "max-age=0",
                Host: TICKET_URLS.const_ticket_host,
                Origin: "https://ticket.urbtix.hk",
                Referer: UrlHelper.parse(TICKET_URLS.ticket_expressPurchase, this.task.config.ticketId, body.performanceId),
                "Upgrade-Insecure-Requests": 1,
            },
            maxRedirects: 0,//开启自动location后返回的是200
            timeout: 15000,//超时
            withCredentials: true,
            transformRequest: [(data, headers) => {
                return qs.stringify(data);
            }],
        });
        if (/\error\/systemError/.test(reviewRet.headers.location)) {
            this.logger.error(`购票失败：系统错误${res3.headers.location}`);
            return false;
        }
        if (reviewRet.status !== 302 && !/\/heldTickets/.test(reviewRet.headers.location)) {
            console.error(`加入购物车失败：${reviewRet.status} # ${reviewRet.headers.location}`);
            return false;
        }
        this.logger.success(`加入购物车成功，正在等待购物车处理：${reviewRet.headers.location}`);
        const handleTicketRet = await this.ticket.request({
            url: reviewRet.headers.location,
            data: body,
            headers: {
                Host: TICKET_URLS.const_ticket_host,
                Origin: "https://ticket.urbtix.hk",
                Referer: UrlHelper.parse(TICKET_URLS.ticket_expressPurchase, this.task.config.ticketId, body.performanceId),
                "Upgrade-Insecure-Requests": 1,
            },
            maxRedirects: 2,//开启自动location后返回的是200
            timeout: 15000,//超时
            withCredentials: true,
        });
        if (handleTicketRet.status !== 200 || /\/shoppingCart$/.test(handleTicketRet.config.url) === false) {
            this.logger.error('加入购物车失败');
            return false;
        }
        this.logger.success(`票务已加入购物车开始提交购买票的个人信息:${reviewRet.headers.location}`);
        return true;
    }


    /**
     * 获取购物车里面的东西
     */
    private async getShopCart() {
        const ret = await this.ticket.request({
            method: 'GET',
            url: `https://ticket.urbtix.hk/internet/secure/shoppingCart`,
            maxRedirects: 0,
            timeout: 5000,
        });
        if (ret.status === 302 && ret.err_status === false && /\/empty/.test(ret.headers.location)) {
            return {error: false, empty: true, data: []};
        }
        if (ret.status === 200) {
            return {error: false, empty: false, data: []};
        }
        return {error: true, empty: true, data: []};
    }


    /**
     * 先清空一波购物车儿
     */
    private async clearCart() {
        const ret = await this.ticket.request({
            method: 'GET',
            ///shoppingCart/shoppingCartItem/order/cancel/event/[eventId]/performance/[performanceId]/[orderId]';
            url: `https://ticket.urbtix.hk/internet/shoppingCart/shoppingCartItem/order/cancel/event/37593/performance/123886/22641172`,
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
            },
            maxRedirects: 0,
            timeout: 5000,
        });


    }

    /**
     * 提交订单的个人信息
     */
    private async requestTicketInfo() {
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
        const back: TaskReturn = {ok: false, retry: false, message: '系统服务错误'};
        if (res.ok && res.status === 200) {
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

            if (ret.status == 302 && /\/transactionPreview/.test(ret.headers.location)) {
                back.ok = true;
                back.retry = false;
                back.data = {
                    location: ret.headers.location
                };
                this.emitter.emit(EventTypes.post_info_success, back);
                return true;
            }
            //失败
            back.retry = false;
            back.message = "这个是系统错误页面,说明有些数据异常了,直接提示失败";
            this.emitter.emit(EventTypes.post_info_fail, back);
            this.logger.error(`提交收货信息失败：${ret.status} # ${ret.headers.location}`);
            return false;
        }
        this.logger.error(`提交收货信息失败：${res.status} # ${res.headers.location}`);
        this.emitter.emit(EventTypes.post_info_fail, back);
        return back.ok;
    }

    /**
     * 进行登录
     * @param page
     * @param login
     */
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


    /**
     * 进行登录
     */
    public async loginAction() {
        ////https://ticket.urbtix.hk/internet/1554887998481/captchaImage.jpeg


    }


    /**
     * 说明失败了
     */
    public async close() {
        await this.browser.close();
    }
}
