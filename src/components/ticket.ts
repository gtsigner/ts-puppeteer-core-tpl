import {HttpHelper, HttpReturn} from "../services/request";
import {ConfigInfo, ConfigService} from "../services/config";
import {TICKET_URLS, UrlHelper} from "../services/url";
import {md5_encode} from "../utils/system";
import {fileAutoCheckDir} from "../utils/file";

import * as path from 'path';

const cheerio = require('cheerio');
const consola = require('consola');
const fs = require('fs');

const setCookieParser = require('set-cookie-parser');

export class TicketHelper {
    private _cookies_sets: string[] = [];
    public static UserAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36';
    private debug: boolean = true;

    public constructor() {

    }


    public static createInstance(config?: any) {
        return new TicketHelper();
    }


    /**
     * 检查宫格错误
     * @param res
     */
    public static checkCommonError(res: HttpReturn): boolean {
        if (/\/error\/systemError/.test(res.headers.location)) {
            return true;
        }
        return false;
    }


    /**
     * 重置和刷新所有的Token
     * @param retry
     */
    public async getAuthToken(retry: number = 10): Promise<HttpReturn> {
        let counter = 0;
        let res: HttpReturn;
        do {
            res = await TicketHelper._requestAuthToken();
            if (res.status === 302 && res.headers['set-cookie']) {
                this._cookies_sets = res.headers['set-cookie'] || [];
                res.success = true;
                return res;
            }
            console.log(`获取失败AuthToken:${res.status} # ${res.headers.location} `);
            counter++;
        } while (res.success === false && counter < retry);
        return res;
    }

    private static async _requestAuthToken(): Promise<HttpReturn> {
        return await HttpHelper.request({
            method: 'GET',
            url: 'http://www.urbtix.hk',
            withCredentials: true,
            headers: {
                Host: 'www.urbtix.hk',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                Referer: 'http://busy.urbtix.hk/redirect.html',
                Connection: 'keep-alive',
                "Accept-Encoding": 'gzip, deflate',
                "User-Agent": TicketHelper.UserAgent
            },
            maxRedirects: 0,
            timeout: 5000
        });
    }


    /**
     * 携带Cookie的请求
     * @param config
     */
    public async request(config: any): Promise<HttpReturn> {
        const headers = config.headers || {};
        const cookie = config.cookieStr || '';
        const res = await HttpHelper.request({
            timeout: 10000,//超时
            withCredentials: true,
            ...config,
            headers: {
                "User-Agent": TicketHelper.UserAgent,
                ...headers,
                Cookie: cookie + this.getCookiesStr()
            }
        });
        res.err_status = TicketHelper.checkCommonError(res);
        if (ConfigService.debug) {
            console.warn(`##### Ticket 新请求:${config.url},返回结果:${res.status} # ${res.headers.location || ''} # ${res.err_status}`);
        }
        return res;
    }


    /**
     * 获取Ticket
     * @param retry number
     */
    public async getInternet(retry: number = 10): Promise<HttpReturn> {
        let counter = 0;
        let res: HttpReturn;
        do {
            res = await this._requestInternet();
            if (res.status === 200 && res.headers['set-cookie']) {
                this._cookies_sets = this._cookies_sets.concat(res.headers['set-cookie']);
            }
            if (res.status === 200) {
                res.success = true;
                return res;
            }
            console.log(`获取失败SessionId:${res.status} # ${res.headers.location}`);
            counter++;
        } while (res.success === false && counter < retry);
        return res;
    }

    /**
     * 获取票详情
     * @param ticket
     * @param retry
     */
    public async getTicketDetail(ticket: ConfigInfo, retry: number = 10): Promise<HttpReturn> {
        let counter = 0;
        let res: HttpReturn;
        do {
            res = await this._requestTicket(ticket);
            if (res.status === 200 && res.headers['set-cookie']) {
                this._cookies_sets = this._cookies_sets.concat(res.headers['set-cookie']);
            }
            if (res.status === 200) {
                res.success = true;
                return res;
            }
            console.log(`获取Ticket失败:` + res.status);
            counter++;
        } while (res.success === false && counter < retry);
        return res;
    }

    /**
     * 请求票
     * @param ticket
     * @private
     */
    private async _requestTicket(ticket: ConfigInfo): Promise<HttpReturn> {
        return await HttpHelper.request({
            url: UrlHelper.parse(TICKET_URLS.ticket_detail, ticket.ticketId),
            withCredentials: true,
            headers: {
                Host: 'ticket.urbtix.hk',
                Referer: 'https://ticket.urbtix.hk/internet/',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                Cookie: this.getCookiesStr(),
                'Upgrade-Insecure-Requests': 1,
                "User-Agent": TicketHelper.UserAgent
            },
            maxRedirects: 0,
            timeout: 5000,
        });
    }


    private async _requestInternet(): Promise<HttpReturn> {
        return await HttpHelper.request({
            url: "https://ticket.urbtix.hk/internet/",
            withCredentials: true,
            headers: {
                Host: 'ticket.urbtix.hk',
                Referer: 'http://busy.urbtix.hk/redirect.html',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                Cookie: this.getCookiesStr(),
                'Upgrade-Insecure-Requests': 1,
                "User-Agent": TicketHelper.UserAgent
            },
            maxRedirects: 0,
            timeout: 5000,
        });
    }


    /**
     * 设置观看过的
     * @param ticket
     */
    public setViewTicketId(ticket: number) {
        this._cookies_sets.push(`recentlyViewedEvents=${ticket}:${Date.now()};`)
    }

    /**
     * 是否授权成功了
     */
    public async isAuthSuccess() {

    }

    public async buyTicket(): Promise<HttpReturn> {
        return null;
    }

    /**
     * 获取Cookies
     */
    public getCookieArray(): string[] {
        return this._cookies_sets;
    }

    /**
     * 获取Cookie
     */
    public getCookies(): any {
        let cookies: any = {};
        this._cookies_sets.forEach((str) => {
            setCookieParser.parse(str).forEach((ck) => {
                cookies[ck.name] = ck.value;
            });
        });
        return cookies;
    }

    /**
     * Cookie实体
     */
    public getCookieEntry(url: string, domain: string = 'urbtix.hk'): any[] {
        let cookies: any[] = [];
        this._cookies_sets.forEach((str) => {
            setCookieParser.parse(str).forEach((ck: any) => {
                ck.domain = domain;
                cookies.push({
                    domain: ck.domain,
                    name: ck.name,
                    value: ck.value,
                    path: ck.path,
                    secure: ck.secure,
                    expires: Date.now() / 1000 + 10000
                });
            });
        });
        return cookies;
    }

    /**
     * 获取SetCookies
     */
    public getSetCookies(): string[] {
        return this._cookies_sets;
    }


    /**
     * 获取CookieStr
     */
    public getCookiesStr(): string {
        let str = '';
        const cookies = this.getCookies();
        Object.keys(cookies).forEach((key: string) => {
            str += ` ${key}=${cookies[key]};`
        });
        return str;
    }

    /**
     * 获取Cookie
     * @param key
     */
    public getCookieValue(key: string): string {
        const cookies = this.getCookies();
        return cookies[key] || null;
    }


    public async autoLogin(url: string): Promise<boolean> {
        const loginRet = await this.request({
            url: url,
            maxRedirects: 0,//后面手动处理
        });
        //if (loginRet)
        if (loginRet.status !== 200) {
            consola.error(`登录页面获取失败,重大错误:${loginRet.headers.location}`);
            return false;
        }
        const $ = cheerio.load(loginRet.data);
        //2.解析
        const data = {
            saveRequestUrl: $('form#loginForm input[name=saveRequestUrl]').val(),
            j_username: "#WALKIN#",
            j_password: "",
            memberType: "non_member",
            captchaType: "IMAGE",
            "captcha-sound": "",
            "captcha-image": "",
            captcha: $('form#loginForm input[id=captcha]').attr('name'),
            captchaPosition: $('form#loginForm input[id=captchaPosition]').attr('name'),
        };
        //2.进行验证码验证
        const checkRes = await this.captchaCheck();
        return true;
    }

    public async captchaCheck() {
        //2.直接访问这个JSON,进行图片下载和进行识别。
        // https://ticket.urbtix.hk/internet/captchaImage/1554887970343/inputKey.json
        const time = new Date().getTime();
        //获取验证码
        const cap = await this.request({
            url: UrlHelper.parse(TICKET_URLS.login_captcha, time),
            maxRedirects: 0,//后面手动处理
            responseType: 'arraybuffer'
        });
        if (cap.status !== 200 || !cap.data || cap.data.length <= 0) {
            consola.error(`获取验证码图片失败:${cap.status} # ${cap.headers.location}`);
            return false;
        }
        const date = new Date();
        const dir = ConfigService.temp + [
            date.getFullYear(),
            date.getMonth(),
            md5_encode(this.getCookieValue('JSESSIONID').toString())
        ].join('_');

        //自动检测文件夹
        await fileAutoCheckDir(dir);
        const filename = path.join(dir, 'main.jpeg');
        await this.saveImage(filename, cap.data);

        //2.请求子图片
        const json = await this.request({
            url: UrlHelper.parse(TICKET_URLS.login_captcha_key, time),
            maxRedirects: 0,//后面手动处理
            headers: {
                Host: TICKET_URLS.const_ticket_host
            }
        });
        if (json.status !== 200 || json.data.retry === true) {
            consola.error(`获取验证码校对图片失败:${json.status} # ${json.headers.location}`);
            return false;
        }
        const images = json.data.inputKeyList.map((item) => {
            return {name: item, url: UrlHelper.parse(TICKET_URLS.login_captcha_check, time, item)}
        });
        const downRet = await this.downloadImages(dir, images);
        //https://ticket.urbtix.hk/internet/j_spring_security_check
        consola.success(`图片下载成功，开始调用机器学习进行图片验证码识别:${filename} , 识别图片：${downRet.length} 个`);
    }

    private async downloadImages(dir, urls: any[]) {
        const funcs: any = urls.map((item) => {
            const filename = path.join(dir, `${item.name}.jpeg`);
            return this._downloadImage(filename, item.url);
        });
        return Promise.all(funcs);
    }

    private async _downloadImage(path, url) {
        const res = await this.request({
            url: url,
            maxRedirects: 0,//后面手动处理
            responseType: 'arraybuffer'
        });
        if (res.status === 200 && res.data && res.data.length > 0) {
            return await this.saveImage(path, res.data);
        }
        return {ok: false, message: `获取图片失败:${url} # ${res.status} # ${res.data.length}`};
    }

    private async saveImage(path: string, buffer) {
        return new Promise(resolve => {
            fs.writeFile(path, Buffer.from(buffer, 'binary'), err => {
                resolve({ok: err === null, error: err, message: '成功'});
            })
        });
    }

}
