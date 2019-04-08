import axios from "axios";

const request = require('request');

const axiosCookieJarSupport = require('axios-cookiejar-support').default;
axiosCookieJarSupport(axios);

export interface HttpReturn {
    status: number,
    data: any,
    headers: any,
    success: boolean,
    ok: boolean,
    message: string,
    request?: any,
    config?: any
}


export class HttpHelper {
    public static createInstance(config) {
        return axios.create({
            headers: {
                Host: 'ticket.urbtix.hk',
                Referer: 'http://busy.urbtix.hk/redirect.html',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Upgrade-Insecure-Requests': 1,
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
            },
            ...config
        });
    }

    public static async request(config): Promise<HttpReturn> {
        return new Promise(resolve => {
            const ret: HttpReturn = {status: 540, ok: false, headers: {}, data: '', message: '成功', success: false};
            axios.request(config).then((res: any) => {
                ret.headers = res.headers;
                ret.status = res.status;
                ret.data = res.data;
                ret.message = "成功";
                ret.config = res.config;
                ret.ok = true;
            }).catch(err => {
                if (err.response) {
                    const response = err.response;
                    ret.status = response.status;
                    ret.headers = response.headers;
                    ret.data = response.data;
                    ret.message = response.statusText;
                }
                if (err.code === 'ECONNABORTED') {
                    ret.message = '服务器访问超时:' + err.message || '';
                }
                ret.config = err.config;
                ret.ok = false;
            }).finally(() => {
                resolve(ret);
            })
        });
    }

    /**
     * 携带Cookie的请求
     * @param config
     */
    public static async requestNative(config): Promise<HttpReturn> {
        return new Promise(resolve => {
            const ret: HttpReturn = {status: 300, ok: false, headers: {}, data: '', message: '成功', success: false};
            request(config, (err, res, body) => {
                if (err) {
                    return resolve(ret);
                }
                ret.headers = res.headers;
                ret.status = res.status;
                ret.data = body;
                return resolve(ret);
            });
        });
    }
}
