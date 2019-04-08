import {HttpHelper} from "../src/services/request";

const qs = require('qs');
const FormData = require('form-data');

async function test() {
    const data = {
        performanceId: '123271',
        isExpressPurchase: true,
        isAdjacentSeat: true,
        isWheelchair: false,
        isWheelChairTicketType: true,
        priceZoneId: '',
        ticketTypeQuantityList:
            [{ticketTypeId: 368, quantity: 1},
                {ticketTypeId: 440, quantity: 1}],
        cOFcGONnIl: 'f4YgCNSw3kgVJJ7BZVAP',
        token: {
            key: '',
            value: ''
        },
        type: {
            key: 'Ow33fnRpPOs9u2Qzqebc',
            value: '638'
        }
    };

    const form = new FormData();
    form.append('performanceId', data.performanceId);
    form.append('isExpressPurchase', data.isExpressPurchase + '');
    form.append('isAdjacentSeat', data.isAdjacentSeat + '');
    form.append('isWheelchair', data.isWheelchair + '');
    form.append('isWheelChairTicketType', data.isWheelChairTicketType + '');
    form.append('priceZoneId', '');
    form.append(data.token.key, data.token.value);
    data.ticketTypeQuantityList.forEach((qu, ix) => {
        form.append(`ticketTypeQuantityList[${ix}][ticketTypeId]`, qu.ticketTypeId + '');
        form.append(`ticketTypeQuantityList[${ix}][quantity]`, qu.quantity + '');
    });
    form.append('performanceId', data.performanceId);
    const res = await HttpHelper.request({
        method: 'POST',
        data: form,
        url:
            'https://ticket.urbtix.hk/internet/secure/form/performanceSelect/event/37441/performance/361459',
        headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'multipart/form-data',
            Cookie: ' Auth_Token=201904090423-49975131984-ad070f4ec9050dbb65189d23e43baf36cddd7a87; xibru_dmt="G6fNEP2a7/fusDA9xMSCsBpA6JFkITZ1AZinNsDRypE="; JSESSIONID=A8EC3FA26F04209E38F98CF28B8756B6.s7; usid=HZ5118565E69BC4A4F92358267E5D2D41E; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=zh_TW;',
        },
        withCredentials: true,
        maxRedirects: 0,
    });
    console.log(res);

}

test().then(re => {

});
