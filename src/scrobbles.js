const fs = require('fs');
const path = require('path');
const parsedArgs = require('minimist');
const puppeteer = require('puppeteer');
const { getTracksFromChartList, readJSON } = require('./helpers');

const getTracksFromPage = (browserPage) => (pageToScrape) => {
    return new Promise(async (resolve) => {
        console.log(`Get scrobbles from ${pageToScrape.url}`);
        await browserPage.goto(pageToScrape.url);
        const tracks = await browserPage.$$eval('.chartlist .chartlist-row', getTracksFromChartList);
        resolve({
            date: pageToScrape.date,
            url: pageToScrape.url,
            data: tracks,
        });
    });
}

function* goThroughPages(browserPage, pagesToScrape) {
    const getDataFromPage = getTracksFromPage(browserPage);
    let i = 0;
    while (i < pagesToScrape.length) {
        yield getDataFromPage(pagesToScrape[i]);
        i++;
    }
}

async function main() {
    // const { inputFile } = parsedArgs(process.argv);
    // console.log(inputFile)
    // if (!inputFile) {
    //     process.stdout.write('No input file specified');
    //     return;
    // }
    // // return;
    const inputPath = path.resolve(__dirname, '..', 'data', '2019-3.json');
    const inputData = await readJSON(inputPath);
    const pagesWithScrobbles = inputData.data.filter(page => page.scrobbles > 0);

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

    page.on('response', (response) => {
        console.log('Response >', response.url(), response.status());
    });

    const generator = goThroughPages(page, pagesWithScrobbles);
    const outputDir = path.resolve(__dirname, '..', 'data');
    // const outputPath = path.resolve(outputDir, `test.json`);
    // const fileData = {
    //     created_at: new Date().toJSON(),
    //     data: pagesWithScrobbles,
    // };
    // fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 4));

    for await (let scrobbles of generator) {
        console.log('> scrobbles', scrobbles.url);
        const params = new URLSearchParams(scrobbles.url);
        const date = new Date(scrobbles.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const outputPath = path.resolve(outputDir, `${year}-${month}-${date.getDate()}-page-${params.get('page')}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(scrobbles, null, 4));
    }

    await browser.close();
}

main();