const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const config = require('../config.json');
const { getScrobblesFromRows } = require('./helpers');

function readJSON(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, { encoding: 'utf-8' }, (err, data) => {
            if (err) {
                reject(err);
            }

            try {
                const parsed = JSON.parse(data);
                resolve(parsed);
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function main() {

    const targetYear = new Date('2006').getFullYear();
    const srcPath = path.resolve(__dirname, '..', 'data', config.username, 'library.json');
    const listeningHistory = await readJSON(srcPath);

    const { url } = listeningHistory.data.find(item => {
        return targetYear === new Date(item.date).getFullYear();
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.resourceType() === 'document') {
            request.continue();
        } else {
            request.abort();
        }
    });

    await page.goto(new URL(url));

    const scrobbles = await page.$$eval(config.selectors.scrobble_table_rows, getScrobblesFromRows);

    await fs.promises.mkdir(path.resolve(__dirname, '..', 'data', config.username, targetYear.toString()), { recursive: true });

    const outputPath = path.resolve(__dirname, '..', 'data', config.username, `${targetYear}.json`);
    const fileData = {
        created_at: new Date().toJSON(),
        data: scrobbles,
    };

    fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 4));

    await browser.close();
}

if (module === require.main) {
    main();
}
