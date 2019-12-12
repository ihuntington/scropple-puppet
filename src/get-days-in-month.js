const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const config = require('../config.json');
const { writeJSON } = require('./helpers');

function getDataFromRows(rows) {
    return new Promise((resolve) => {
        const data = Array.from(rows).map((row) => {
            const cells = row.cells;
            const timestamp = parseInt(cells[0].dataset.timestamp, 10);
            const url = cells[0].firstElementChild.href;
            const scrobbles = parseInt(cells[1].textContent, 10);

            return {
                url,
                scrobbles,
                // timestamp in last.fm is in seconds so convert to milliseconds
                date: new Date(timestamp * 1000).toJSON(),
            };
        });

        resolve(data);
    });
}

function getListeningHistory(page, month) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('Go to URL:', month.url);
            await page.goto(month.url);
            const items = await page.$$eval(config.selectors.scrobble_table_rows, getDataFromRows);
            resolve({
                ...month,
                items,
            });
        } catch (error) {
            console.log('Error requesting:', month.url);
            reject();
        }
    });
}

function* makeGenerator(page, months) {
    let count = 0;
    while (count < months.length) {
        yield getListeningHistory(page, months[count]);
        count++;
    }
}

async function main() {
    const parsedArgs = minimist(process.argv);
    let headless = true;

    if (!parsedArgs.year) {
        throw new Error('You must specify a year');
    }

    if (parsedArgs.headless === 'false') {
        headless = false;
    }

    const outputDir = path.resolve(__dirname, '..', 'data', config.username);
    const entryFile = await fs.promises.readFile(path.resolve(outputDir, `${parsedArgs.year}.json`));
    const months = JSON.parse(entryFile).items;
    const browser = await puppeteer.launch({ headless });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.resourceType() === 'document') {
            request.continue();
        } else {
            request.abort();
        }
    });

    const generator = makeGenerator(page, months);

    for await (let result of generator) {
        const date = new Date(result.date);
        const year = date.getFullYear().toString();
        const month = date.getMonth().toString();
        const outputData = {
            created_at: new Date().toJSON(),
            url: result.url,
            items: result.items,
        };

        await writeJSON(path.resolve(outputDir, year, month, 'index.json'), outputData);
    }

    await browser.close();

    console.log('Done');
    process.exit(0);
}

if (module === require.main) {
    main().catch(console.log);
}