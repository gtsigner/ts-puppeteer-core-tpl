const cheerio = require('cheerio');
let str = '<div class="perf-step-blk" id="step-1">\n' +
    '\t\t<div class="step-header">\n' +
    '\t\t\t<div class="step-txt">步驟 1)</div>\n' +
    '\t\t\t<div class="step-desc">選擇相關票價, 優惠種類及數量</div>\n' +
    '\t\t</div>\n' +
    '\t\t<div class="step-content">\n' +
    '\t<table id="ticket-select-tbl">\n' +
    '\t\t<caption class="hidden">門票之區段及票價</caption>\n' +
    '\t\t<tbody><tr>\n' +
    '\t\t\t<td class="ticket-select-blk" id="ticket-price-col">\n' +
    '\t\t\t\t<div class="ticket-select-subtitle">門票之區段及票價</div>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<table id="ticket-price-tbl">\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t<tbody><tr>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-col" data-color_code="#FFFF11" style="color: rgb(0, 0, 0); background-color: rgb(255, 255, 17);">&nbsp;</td>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-name-col">\n' +
    '\t\t\t\t\t\t\t\tA\n' +
    '\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t\t<br>\n' +
    '\t\t\t\t\t\t\t\t$200\n' +
    '\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-select-col">\n' +
    '\t\t\t\t\t\t\t\t<input type="hidden" name="priceZoneId" value="">\n' +
    '\t\t\t\t\t\t\t\t\t \n' +
    '\t\t\t\t\t\t\t\t\t<fieldset class="performance-fieldset">\n' +
    '\t\t\t\t\t\t\t\t\t\t<legend class="hidden">\n' +
    '\t\t\t\t\t\t\t\t\t\t\t門票區段 A\n' +
    '\t\t\t\t\t\t\t\t\t\t</legend>\n' +
    '\t\t\t\t\t\t\t\t\t\t<input type="radio" class="pricezone-radio-input" name="3FTjk2LL0jWHjbfxpPoB" value="368" checked="" title="門票區段 A">\t\n' +
    '\t\t\t\t\t\t\t\t\t</fieldset>\t\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t</tr>\n' +
    '\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t<tr>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-col" data-color_code="#663300" style="color: rgb(255, 255, 255); background-color: rgb(102, 51, 0);">&nbsp;</td>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-name-col">\n' +
    '\t\t\t\t\t\t\t\t輪椅區１\n' +
    '\t\t\t\t\t\t\t\t*\n' +
    '\t\t\t\t\t\t\t\t<br>\n' +
    '\t\t\t\t\t\t\t\t$200\n' +
    '\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t\t<td class="ticket-pricezone-select-col">\n' +
    '\t\t\t\t\t\t\t\t<input type="hidden" name="priceZoneId" value="">\n' +
    '\t\t\t\t\t\t\t\t\t \n' +
    '\t\t\t\t\t\t\t\t\t<fieldset class="performance-fieldset">\n' +
    '\t\t\t\t\t\t\t\t\t\t<legend class="hidden">\n' +
    '\t\t\t\t\t\t\t\t\t\t\t門票區段 輪椅區１\n' +
    '\t\t\t\t\t\t\t\t\t\t</legend>\n' +
    '\t\t\t\t\t\t\t\t\t\t<input type="radio" class="pricezone-radio-input" name="3FTjk2LL0jWHjbfxpPoB" value="638" title="門票區段 輪椅區１">\t\n' +
    '\t\t\t\t\t\t\t\t\t</fieldset>\t\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t</tr>\n' +
    '\t\t\t\t\t\n' +
    '\t\t\t\t\t\t<tr>\n' +
    '\t\t\t\t\t\t\t<td colspan="2">\n' +
    '\t\t\t\t\t\t\t\t<font color="red">* 只有輪椅人士和其看顧人可以使用輪椅區門票入場</font>\n' +
    '\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t\t<td></td>\n' +
    '\t\t\t\t\t\t</tr>\n' +
    '\t\t\t\t</tbody></table>\n' +
    '\t\t\t\t\n' +
    '\t\t\t\t<script>\n' +
    '\t\t\t\t\t$(\'td.ticket-pricezone-col\').each(function(){\n' +
    '\t\t\t\t\t\t\tvar bgColour = $(this).attr(\'data-color_code\');\n' +
    '\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\tvar _red = parseInt(bgColour.substr(1, 2),16);\n' +
    '\t\t\t\t\t\t\tvar _green = parseInt(bgColour.substr(3, 2),16);\n' +
    '\t\t\t\t\t\t\tvar _blue = parseInt(bgColour.substr(5, 2),16);\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\tvar brightness = (luminanace(255, 255, 255) + 0.05) / (luminanace(_red, _green, _blue) + 0.05);\n' +
    '\t\t\t\t\t\t\tvar p_str_color = \'#FFFFFF\';\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\tif(brightness < 4.5){\n' +
    '\t\t\t\t\t\t\t\tp_str_color = \'#000000\';\n' +
    '\t\t\t\t\t\t\t}\n' +
    '\t\t\t\t\t\t\t$(this).css({ \'color\': p_str_color });\t\t\t\t\t\t\t\n' +
    '\t\t\t\t\t\t\t$(this).css({ \'background-color\': bgColour });\n' +
    '\t\t\t\t\t});\n' +
    '\t\t\t\t\t\n' +
    '\t\t\t\t\tfunction luminanace(r, g, b) {\n' +
    '\t\t\t\t\t    var a = jQuery.map([r,g,b], function(v) {\n' +
    '\t\t\t\t\t        v /= 255;\n' +
    '\t\t\t\t\t        return (v <= 0.03928) ?\n' +
    '\t\t\t\t\t            v / 12.92 :\n' +
    '\t\t\t\t\t            Math.pow( ((v+0.055)/1.055), 2.4 );\n' +
    '\t\t\t\t\t        });\n' +
    '\t\t\t\t\t    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;\n' +
    '\t\t\t\t\t}\n' +
    '\t\t\t\t</script>\n' +
    '\t\t\t</td>\n' +
    '\t\t\t<td class="ticket-select-vertical-bar">&nbsp;</td>\n' +
    '\t\t\t<td class="ticket-select-blk" id="ticket-type-col">\n' +
    '\t\t\t\t<div class="ticket-select-subtitle">門票類別及購買數量</div>\n' +
    '\t\t\t\t<div id="ticket-type-review">\n' +
    '\t\t\t\t\t<a tabindex="0" class="view-ticket-details-link cursor-pointer alink-decoration" data-perf_id="126164" title="查看門票詳情">\n' +
    '查看門票詳情\t\t\t\t\t\t<img class="view-ticket-details-icon" src="/internet/images/magnifier.png" title="查看門票詳情" alt="">\n' +
    '\t\t\t\t\t</a>\n' +
    '\t\t\t\t</div>\n' +
    '\t\t\t\t<table id="ticket-type-tbl">\n' +
    '\t\t\t\t\t\t\t\t<tbody><tr>\n' +
    '\t\t\t\t\t\t\t\t\t<td class="ticket-type-col">\n' +
    '\t\t\t\t\t\t\t\t\t\t正價票 - $200\n' +
    '\t\t\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t\t\t\t<td class="ticket-type-quota">\n' +
    '\t\t\t\t\t\t\t\t\t\t<input type="hidden" name="ticketTypeQuantityList[0].ticketTypeId" value="223">\n' +
    '\t\t\t\t\t\t\t\t\t\t\t<label class="hidden" for="ticket-quota-223-sel">\n' +
    '請選擇數量\t\t\t\t\t\t\t\t\t\t\t</label>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t<select class="chzn-select ticket-quota-select" id="ticket-quota-223-sel" name="ticketTypeQuantityList[0].quantity" title="請選擇數量" data-ticket_type_id="223" data-ticket_type_code="STAN">\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="0">0</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="1">1</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="2">2</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="3">3</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="4">4</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="5">5</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="6">6</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="7">7</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="8">8</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="9">9</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="10">10</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="11">11</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="12">12</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="13">13</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="14">14</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="15">15</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="16">16</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="17">17</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="18">18</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="19">19</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="20">20</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="21">21</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="22">22</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="23">23</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="24">24</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="25">25</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="26">26</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="27">27</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="28">28</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="29">29</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="30">30</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="31">31</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="32">32</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="33">33</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="34">34</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="35">35</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="36">36</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="37">37</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="38">38</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="39">39</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t\t\t<option value="40">40</option>\n' +
    '\t\t\t\t\t\t\t\t\t\t\t</select>\n' +
    '\t\t\t\t\t\t\t\t\t</td>\n' +
    '\t\t\t\t\t\t\t\t</tr>\n' +
    '\t\t\t\t</tbody></table>\n' +
    '\t\t\t\t<div id="loading-blk" class="hidden text-center">\n' +
    '\t\t\t\t\t<img class="ajax-loading" src="/internet/images/ajax-loader.gif" title="請稍候..." alt="請稍候..."><br>\n' +
    '\t\t\t\t\t<span class="loading-txt">請稍候...</span>\n' +
    '\t\t\t\t</div>\n' +
    '\t<div class="ajax-call-error hidden">\n' +
    '\t\t<span>抱歉，系統暫未能回應你的要求，請稍候再試。</span>\n' +
    '\t</div>\n' +
    '\t\t\t\t<div id="download-seat-plan-blk">\n' +
    '\t\t\t\t\t<a class="alink-decoration" href="http://www.lcsd.gov.hk/tc/ticket/seat.html" title="下載座位表(opens new window 在新視窗開啟 在新视窗开启)" target="_blank">\n' +
    '下載座位表\t\t\t\t\t </a>\n' +
    '\t\t\t\t\t &nbsp;\n' +
    '\t\t\t\t\t <div>(包括適合輪椅使用者的座位)</div>\n' +
    '\t\t\t\t</div>\n' +
    '\t\t\t\t<div id="adjacent-seats-select">\n' +
    '\t\t\t\t\t<span id="wheel-chair-guide-check">\n' +
    '相連座位\t\t\t\t\t</span> <input type="checkbox" id="adjacent-seats-chk" checked="" title="相連座位">\n' +
    '\t\t\t\t</div>\n' +
    '\t\t\t</td>\n' +
    '\t\t\t<td class="ticket-select-vertical-bar">&nbsp;</td>\n' +
    '\t\t\t<td class="ticket-select-blk" id="seat-template-col">\n' +
    '\t\t\t\t<div class="ticket-select-subtitle">座位區預覽圖</div>\n' +
    '\t\t\t\t<div id="template-img-blk">\n' +
    '\t\t\t\t\t\t<img src="/internet/p_image/seat_plan/126164.jpg?t=1554750452510" title="座位區預覽圖" alt="座位區預覽圖" width="240" height="320">\n' +
    '\t\t\t\t</div>\n' +
    '\t\t\t</td>\n' +
    '\t\t</tr>\n' +
    '\t</tbody></table>\n' +
    '\t\t</div>\n' +
    '\t</div>'
const $ = cheerio.load(str);
console.log($);
