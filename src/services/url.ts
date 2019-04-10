export class UrlHelper {
    private static URLS = {
        ticket: 'https://ticket.urbtix.hk/internet/secure/event/{0}/performanceDetail/{1}',
        busy: 'http://busy.urbtix.hk/'
    };

    /**
     * 解析
     * @param url
     * @param args
     */
    public static parse(url: string, ...args): string | false {
        if (!url) {
            return false;
        }
        args.forEach((value, index: number) => {
            const reg = new RegExp(`\\{${index}\}`, 'g');
            url = url.replace(reg, value);
        });
        return url;
    }
}

export const TICKET_URLS = {
    ticket_detail: 'https://ticket.urbtix.hk/internet/eventDetail/{0}',
    //login，success
    login_redirect: `https://ticket.urbtix.hk/internet/zh_TW/login/transaction?saveRequestUrl=/zh_TW/secure/event/{0}/performanceDetail/{1}`,
    //login
    login_detail: `https://ticket.urbtix.hk/internet/zh_TW/login/transaction?saveRequestUrl=/zh_TW/eventDetail/{0}`,

    //获取票价格等数据
    ticket_price_info: `https://ticket.urbtix.hk/internet/json/performance/{0}/pricezone/{1}/ticketType.json?locale=zh_TW&{2}`,
    //票
    ticket_choose: `https://ticket.urbtix.hk/internet/zh_TW/secure/event/{0}/performanceDetail/{1}`,
    //选票
    ticket_pre_post: `https://ticket.urbtix.hk/internet/secure/form/performanceSelect/event/{0}/performance/{1}`,
    //加入购物车
    ticket_form_reviewTicket: `https://ticket.urbtix.hk/internet/secure/form/reviewTicket/event/{}/performance/{1}`,

    ticket_shop_cart: 'https://ticket.urbtix.hk/internet/zh_TW/secure/shoppingCart',
    //支付地址
    ticket_pay_url: 'https://ticket.urbtix.hk/internet/secure/form/mailingPayment',
    //支付信息地址
    ticket_pay_info: 'https://ticket.urbtix.hk/internet/zh_TW/secure/mailingPayment',

    const_ticket_host: 'ticket.urbtix.hk'
};
