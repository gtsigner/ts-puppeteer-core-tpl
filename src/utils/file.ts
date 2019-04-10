const fs = require('fs-extra')

export async function fileAutoCheckDir(dir: string) {
    return await fs.ensureDir(dir);
}
