const path = require('path');
const puppeteer = require('puppeteer');
const { getListeningHistoryScrobbles } = require('./page-functions');
const { readJSON, writeJSON } = require('./helpers');
const libraryUrl = 'https://www.last.fm/user/<username>/library?date_preset=ALL';

class Scropple {
    constructor(config) {
        this.__config = config;
        this.username = config.username;
    }

    set username(username) {
        this._username = username;
    }

    get username() {
        return this._username;
    }

    get libraryUrl() {
        return libraryUrl.replace(/<username>/, this.username);
    }

    get yearsPath() {
        if (this.username) {
            return ['data', this.username, 'years.json']
        }
    }

    set browser(browser) {
        this._browser = browser;
    }

    get browser() {
        return this._browser;
    }

    async launch() {
        if (!this.browser) {
            console.log('Launch puppeteer');
            let headless = true;

            if (this.__config.puppeteer.headless === false) {
                headless = !headless;
            }

            this.browser = await puppeteer.launch({
                headless,
            });
        }

        return this;
    }

    async exit() {
        if (this.browser) {
            console.log('Exit puppeteer');
            await this.browser.close();
        }
    }

    // Uncertain if newPage should return a new Promise... but how to do that
    // with an asychronous function?
    async newPage() {
        if (!this.browser) {
            await this.launch();
        }

        this.page = await this.browser.newPage();

        await this.page.setRequestInterception(true);

        this.page.on('request', (request) => {
            if (request.resourceType() === 'document') {
                request.continue();
            } else {
                request.abort();
            }
        });

        // this.page.on('close', (...args) => {
        //     console.log('Close page', ...args);
        // });

        return this.page;
    }

    async getListeningHistory(url) {
        await this.newPage();
        let result;

        try {
            console.log('Scrape listening history from %s', url);
            await this.page.goto(url);
            // filter out entries with no scrobbles
            result = await this.page.$$eval(this.__config.selectors.scrobble_table_rows, getListeningHistoryScrobbles);
        } catch (err) {
            console.log('Unable to scrape page %s', url);
            console.log(err.stack);
            result = null;
        }

        await this.page.close();

        return new Promise((resolve) => resolve(result));
    }

    async getLibrary() {
        await this.newPage();
        await this.page.goto(this.libraryUrl);

        const data = await this.page.$$eval(this.__config.selectors.scrobble_table_rows, getListeningHistoryScrobbles);
        await this.saveLibrary(data);
        await this.page.close();

        return new Promise((resolve) => resolve());
    }

    async scrapePage(year) {
        console.log('Get listening history from:', year.url);
        await this.page.goto(year.url);
        const items = await this.page.$$eval(this.__config.selectors.scrobble_table_rows, getListeningHistoryScrobbles);
        return {
            ...year,
            items,
        };
    }

    * _makeScrapeListeningHistoryIterator(items) {
        let count = 0;
        while (count < items.length) {
            yield this.scrapePage(items[count]);
            count++;
        }
    }

    // Outputs a JSON file for each year with URLs to each month
    async getYears(dirtyYear) {
        let { items } = await this.readLibrary();
        let targetYear;

        if (dirtyYear) {
            targetYear = new Date(dirtyYear, 0, 1).getFullYear();
        }

        if (targetYear) {
            items = items.filter((item) => {
                const date = new Date(item.date);
                return date.getFullYear() === targetYear;
            });
        }

        await this.newPage();

        const generator = this._makeScrapeListeningHistoryIterator(items);

        for await (let result of generator) {
            const date = new Date(result.date);
            const year = date.getFullYear().toString();
            const outputData = {
                created_at: new Date().toJSON(),
                items: result.items,
            };
            const outputPath = path.resolve(__dirname, '..', 'data', this.username, `${year}.json`);

            await writeJSON(outputPath, outputData);
        }

        await this.page.close();
    }

    async save(data) {
        const filePath = path.resolve(__dirname, '..', 'data', this.username, this.__config.library_filename);
        const fileData = {
            created_at: new Date().toJSON(),
            items: data,
        };

        await writeJSON(filePath, fileData);
    }

    async saveLibrary(data) {
        const filePath = path.resolve(__dirname, '..', 'data', this.username, this.__config.library_filename);
        const fileData = {
            created_at: new Date().toJSON(),
            items: data,
        };

        try {
            console.log('Write to file %s', filePath);
            await writeJSON(filePath, fileData);
        } catch (err) {
            console.log('Unable to write to %s', filePath);
            console.log(err.stack);
        }
    }

    async saveMonth(year, month, data) {
        const filePath = path.resolve(__dirname, '..', 'data', this.username, year, month, 'index.json');
        try {
            console.log('Write to file %s', filePath);
            await writeJSON(filePath, data);
        } catch (err) {
            console.log('Unable to write to %s', filePath);
            console.log(err.stack);
        }
    }

    async readLibrary() {
        const filePath = path.resolve(__dirname, '..', 'data', this.username, this.__config.library_filename);
        const data = await readJSON(filePath);
        return data;
    }
}

module.exports = Scropple
