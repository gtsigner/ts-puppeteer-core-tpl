export async function sleep(time: number) {
    return new Promise((resolve => {
        setTimeout(resolve, time);
    }))
}

import * as crypto from 'crypto'


export function md5_encode(str: string): string {
    const obj = crypto.createHash('md5');
    obj.update(str);
    return obj.digest('hex');
}
