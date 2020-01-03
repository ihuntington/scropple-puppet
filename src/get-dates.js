const path = require('path');
const minimist = require('minimist');
const klaw = require('klaw');
const puppeteer = require('puppeteer');
const config = require('../config.json');
const { excludeDirFilter, includeJsonFilter, readJSON, writeJSON, getTracksFromChartList } = require('./helpers');

function scrapePage(browserPage, item) {
    return new Promise((resolve) => {
        const result = {
            date: item.date,
            success: [],
            fail: [],
        };

        const gotoUrl = async (url) => {
            try {
                // TODO: logging should be done with events
                console.log('Go to URL', url);
                // Tell Puppeteer to go to the URL
                await browserPage.goto(url);
            } catch (err) {
                console.log('Error requesting URL', url);
                console.log(err);

                // The URL failed to load so push the error message into result's
                // fail array to be processed later on
                result.fail.push({
                    url,
                    reason: err.message,
                });

                // Return and resolve the result... may have got some tracks or none
                // depending on pagination
                return resolve(result);
            }

            // Use a try/catch block as if no tracks an error is thrown by $eval
            try {
                // Query to see if there is a table of tracks and if so then
                // extract the data we require
                const tracks = await browserPage.$$eval('.chartlist .chartlist-row', getTracksFromChartList);
                // Push the tracks into the result's success array
                result.success.push({
                    url,
                    items: tracks,
                });
            } catch (err) {
                // Ideally we should not reach this scenario but if there are no
                // tracks we resolve the promise with the result
                return resolve(result);
            }

            // Use a try/catch block as if no next link an error is thrown by $eval
            try {
                // Query to see if a next link exists, if so grab the href
                const next = await browserPage.$eval('.pagination-next a', el => el.href);

                // Go to the next page of results
                return gotoUrl(next);
            } catch (err) {
                // Reached end of pagination as no next link
                return resolve(result);
            }
        };

        // Start the process of scraping
        gotoUrl(item.url);
    });
}

function* makeScraperIterator(browserPage, data) {
    const pagesWithScrobbles = data.items.filter((item) => item.scrobbles !== 0);
    for (let page of pagesWithScrobbles) {
        yield scrapePage(browserPage, page);
    }
}

async function* makeReadFileIterator(page, files) {
    for (let file of files) {
        const data = await readJSON(file);
        yield* makeScraperIterator(page, data);
    }
}

async function start(files) {
    console.log(files);
    const browser = await puppeteer.launch({ headless: true });
    const browserPage = await browser.newPage();
    const libraryPath = path.resolve(__dirname, '..', 'data', config.username);

    await browserPage.setRequestInterception(true);

    browserPage.on('request', (request) => {
        if (request.resourceType() === 'document') {
            request.continue();
        } else {
            request.abort();
        }
    });

    const generator = makeReadFileIterator(browserPage, files);
    let failedRequests = [];

    for await (let result of generator) {
        if (result.fail.length > 0) {
            // Bug: fix this
            failedRequests.push(...request.fail);
        }

        if (result.success.length > 0) {
            const items = result.success.reduce((previous, current) => {
                return previous.concat(current.items);
            }, []);
            const datestamp = new Date(result.date);
            const year = datestamp.getFullYear().toString();
            const month = datestamp.getMonth().toString();
            const date = datestamp.getDate().toString();
            const outputPath = path.resolve(libraryPath, year, month, `${date}.json`);
            const outputData = {
                created_at: new Date().toJSON(),
                date: result.date,
                items,
            };
            console.log('Write data to', outputPath);
            await writeJSON(outputPath, outputData);
        }
    }

    const now = (Date.now() / 1000).toString();
    const errorLogPath = path.resolve(__dirname, '..', `error-${now}.json`);
    await writeJSON(errorLogPath, { failedRequests });

    await browser.close();
    process.exit(0);
}

async function main() {
    const parsedArgs = minimist(process.argv);

    if (!parsedArgs.year) {
        console.log('You must specify a year');
        process.exit(1);
    }

    const dataPath = path.resolve(__dirname, '..', 'data', config.username, parsedArgs.year.toString());
    const files = [];

    klaw(dataPath)
        .pipe(excludeDirFilter)
        .pipe(includeJsonFilter)
        .on('readable', function () {
            let file;
            // eslint-disable-next-line no-cond-assign
            while (file = this.read()) {
                files.push(file.path);
            }
        })
        .on('end', () => {
            start(files);
        });
}

if (module === require.main) {
    main();
}
