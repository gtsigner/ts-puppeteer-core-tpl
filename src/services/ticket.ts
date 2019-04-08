import {HttpHelper, HttpReturn} from "./request";

const setCookieParser = require('set-cookie-parser');

export class TicketHelper {
    private _cookies_sets: string[] = [];

    public constructor() {

    }


    public static createInstance(config?: any) {
        return new TicketHelper();
    }

    /**
     * 重置和刷新所有的Token
     */
    public async getAuthToken(): Promise<HttpReturn> {
        let res = await HttpHelper.request({
            method: 'GET',
            url: 'http://www.urbtix.hk',
            withCredentials: true,
            headers: {
                Host: 'www.urbtix.hk',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                Referer: 'http://busy.urbtix.hk/redirect.html',
                Connection: 'keep-alive',
                "Accept-Encoding": 'gzip, deflate',
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
            },
            maxRedirects: 0,
            timeout: 5000,
        });
        if (res.status === 302 && res.headers['set-cookie']) {
            this._cookies_sets = res.headers['set-cookie'] || [];
            res.success = true;
        }
        return res;
    }

    /**
     * 获取Ticket
     */
    public async getInternet(): Promise<HttpReturn> {
        const res = await HttpHelper.request({
            url: "https://ticket.urbtix.hk/internet/",
            withCredentials: true,
            headers: {
                Host: 'ticket.urbtix.hk',
                Referer: 'http://busy.urbtix.hk/redirect.html',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                Cookie: this.getCookiesStr(),
                'Upgrade-Insecure-Requests': 1,
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
            },
            maxRedirects: 0,
            timeout: 5000,
        });
        // const res = await HttpHelper.requestNative({
        //     url: "https://ticket.urbtix.hk/internet/",
        //     headers: {
        //         Host: 'ticket.urbtix.hk',
        //         Referer: 'http://busy.urbtix.hk/redirect.html',
        //         Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        //         Cookie: this.getCookiesStr(),
        //         'Upgrade-Insecure-Requests': 1,
        //         "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
        //     }
        // });
        if (res.status === 200 && res.headers['set-cookie']) {
            this._cookies_sets = this._cookies_sets.concat(res.headers['set-cookie']);
        }
        if (res.status === 200) {
            res.success = true;
        }
        return res;
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
                console.log(ck);
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

}
