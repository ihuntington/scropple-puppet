const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const minimist = require('minimist');
const { getScrobblesFromRows } = require('./helpers');
const config = require('../config.json');
const source = require('../data/2019.json');
const { scrobbles_per_page } = config;

function addPagination(item) {
    if (item.scrobbles === 0) {
        return item;
    }

    const numOfPages = Math.ceil(item.scrobbles / scrobbles_per_page);

    if (numOfPages === 1) {
        return {
            ...item,
            url: `${item.url}&page=1`,
        };
    }

    return Array(numOfPages).fill().map((_, index) => ({
        url: `${item.url}&page=${index + 1}`,
        date: item.date,
        scrobbles: (index + 1 === numOfPages) ? item.scrobbles % (scrobbles_per_page * index) : scrobbles_per_page,
    }));
}

const getListeningHistory = (page) => (scrobbleTarget) => {
    return new Promise(async (resolve) => {
        await page.goto(scrobbleTarget.url);
        const data = await page.$$eval(config.selectors.scrobble_table_rows, getScrobblesFromRows);
        resolve({
            date: scrobbleTarget.date,
            data: data.reduce((accum, curr) => accum.concat(addPagination(curr)), []),
        });
    });
}

function* goThroughPages(page, urls) {
    const getDataFromPage = getListeningHistory(page);
    let i = 0;
    while(i < urls.length) {
        yield getDataFromPage(urls[i]);
        i++;
    }
}

async function main() {
    const parsedSource = source;
    // const parsedArgs = minimist(process.argv);

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

    const generator = goThroughPages(page, parsedSource.data);
    const outputDir = path.resolve(__dirname, '..', 'data');

    for await (let scrobbles of generator) {
        const date = new Date(scrobbles.date);
        const year = date.getFullYear();
        const month = date.getMonth();

        const outputPath = path.resolve(outputDir, `${year}-${month}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(scrobbles));
    }

    await browser.close();
}

main();
