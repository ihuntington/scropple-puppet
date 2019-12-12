const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const config = require('../config.json');
const { readJSON, writeJSON } = require('./helpers');

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

function getListeningHistory(page, year) {
    return new Promise(async (resolve) => {
        console.log('Go to URL:', year.url);
        await page.goto(year.url);
        const items = await page.$$eval(config.selectors.scrobble_table_rows, getDataFromRows);
        resolve({
            ...year,
            items,
        });
    });
}

function* makeGenerator(page, items) {
    let count = 0;
    while (count < items.length) {
        yield getListeningHistory(page, items[count]);
        count++;
    }
}

async function main() {
    const outputDir = path.resolve(__dirname, '..', 'data', config.username);
    const libraryPath = path.resolve(outputDir, 'library.json');
    const libraryData = await readJSON(libraryPath);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.resourceType() === 'document') {
            request.continue();
        } else {
            request.abort();
        }
    });

    const generator = makeGenerator(page, libraryData.data);

    for await (let result of generator) {
        console.log('Result of generator');
        const date = new Date(result.date);
        const year = date.getFullYear().toString();
        const outputData = {
            created_at: new Date().toJSON(),
            items: result.items,
        };

        await writeJSON(path.resolve(outputDir, `${year}.json`), outputData);
    }

    // await page.goto(new URL(url));

    // const scrobbles = await page.$$eval(config.selectors.scrobble_table_rows, getScrobblesFromRows);

    // await fs.promises.mkdir(path.resolve(__dirname, '..', 'data', config.username, targetYear.toString()), { recursive: true });

    // const outputPath = path.resolve(__dirname, '..', 'data', config.username, `${targetYear}.json`);
    // const fileData = {
    //     created_at: new Date().toJSON(),
    //     data: scrobbles,
    // };

    // fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 4));

    await browser.close();

    console.log('Done');
    process.exit(0);
}

if (module === require.main) {
    main();
}
