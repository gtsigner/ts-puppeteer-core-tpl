export class UrlTpl {
    private static URLS = {
        ticket: 'https://ticket.urbtix.hk/internet/secure/event/{0}/performanceDetail/{1}',
        busy: 'http://busy.urbtix.hk/'
    };

    /**
     * 解析
     * @param key
     * @param args
     */
    public static parse(key, ...args): string | false {
        let url: string = this.URLS[key];
        if (!url) {
            return false;
        }
        args.forEach((value, index: number) => {
            const reg = new RegExp(`\{${index}\}`, 'g');
            url = url.replace(reg, value);
        });
        return url;
    }
}
