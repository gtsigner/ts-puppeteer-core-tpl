const puppeteer = require('puppeteer-core');
const path = require('path');

export class Creator {
    static async createBrowser(): Promise<any> {
        return await puppeteer.launch({
            executablePath: path.resolve('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'),
            headless: false,
            defaultViewport: {
                height: 1080,
                width: 1920,
                deviceScaleFactor: 2
            },
            args: ['--window-size=1920,1080']
        });
    }

}
