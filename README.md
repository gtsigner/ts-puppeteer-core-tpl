## 自动化软件模板

##
## 报价
验证码报价5k 3种验证码识别，自动化采集方案5k，账号管理功能：2k，总计1.2w 优惠2k
 
## 验证码方案
Python OpenCV 验证码识别，3套验证码费用3-6k
 
## 方案1 自动化浏览器
Puppteer 自动化方案，部署linux，多账号管理等 稳定。
 
## 方案2协议
协议方案相对来说比较复杂，主要是怕一些header和一些js检测功能，容易屏蔽。
 
## 操作步骤
1. 我们只做前面的7抢票步骤，配置资料信息等excel到文件，然后写入抢票的地址，票信息配置等，然后启动软件后开始自动化采集，采集结束后生成文件如下
2. 然后写入到文件，如果成功，就是把成功的信用卡资料等写入到文件说明说这个信用卡的成功抢到票.

##
我之前用人家的搶票器 他們這一部份是儲在txt檔裡面
根據排序填寫 比如說 排序是姓，名，電郵，1，信用卡號碼，安全碼，到期日

那txt裡面就會有很多行資料
1. CHAN, TAI MAN, dasjkdj@gmail.com, 1, 432332321312521, 402, 02/23
2. LI, BI BI, dajsd@yahoo.com, 1, 421421321321321, 821, 12/22

那付款的時侯我們只需要決定用幾號的個人資料就可以很快搞定


##
http://busy.urbtix.hk/redirect.html

##
另外在選票的那個頁面 我們想要自動購票的優先順序
比如說他那個演唱會有兩天 星期六和星期天 分別有3個票價（＄280，＄480，＄780）
如果我們想要優先買 星期天的＄780 如果買不到就搶星期六的＄480 ，之後再買不到就買星期天的＄280 
如此類推

可以做的到嗎？

## 配置

```

{
    "ticket": {
       //买票地址
      "url": "https://ticket.urbtix.hk/internet/login/transaction?saveRequestUrl=/secure/event/38096/performanceDetail/369840",
      "type": 1,//买票的A B C
      "buy": {
        "0": 1, //第一种票买多少张
        "1": 4, //第2种票买多少张
        "2": 3 //第3种票买多少张
      },
      "site": true, //自动座位
      "card": {
        "x": "123",//姓
        "m": "!23",//名字
        "mail": "123",//邮箱
        "method": "1",//支付方法
        "number": "!23",//卡号
        "safe": "123", //信用卡安全码
        "date": ""  信用卡日期
      }
    }
```

```text
1.售票ID：38185 URL中的eventDetail参数
2.场次：performanceDetail 参数
3.門票之區段及票價序列号，1代表第一个，2代表第二个
4.門票類別及購買數量 格式[序号=数量,序号=数量]
5.是否勾选相邻作为 1勾选，0不勾选
6.姓
7.名
8.電郵地址
9.請選擇領取門票方法 序号1，2，3，4
10.付款方法序号,1.2.3
11.卡号
12.安全码
13.有效期 2019-10
```
```text
售票ID,场次ID,1,[1=2|2=3],1,赵,俊,1716771371@qq.com,1,1,123,123,2018-29
```
1. CHAN, TAI MAN, dasjkdj@gmail.com, 1, 432332321312521, 402, 02/23
2. LI, BI BI, dajsd@yahoo.com, 1, 421421321321321, 821, 12/22


##
```text
     //解析信息加入购物车
            // reviewType: reviewing
            // seatTicketTypeList[0].newTicketTypeId: 223
            // seatTicketTypeList[0].useRealNameTicket: false
            // performanceIds: 125848
            // hosueId: 12952
            // seatTicketTypeList[0].orderItemId: 1
            // seatTicketTypeList[0].priceZoneId: 368
            // seatTicketTypeList[0].currentTicketTypeId: 223

            // seatTicketTypeList[1].newTicketTypeId: 223
            // seatTicketTypeList[1].useRealNameTicket: false
            // seatTicketTypeList[1].orderItemId: 2
            // seatTicketTypeList[1].priceZoneId: 368
            // seatTicketTypeList[1].currentTicketTypeId: 223
            //https://ticket.urbtix.hk/internet/secure/form/reviewTicket/event/38138/performance/126083
```
