const path = require('path');
const puppeteer = require('puppeteer');
const { getScrobblesFromRows, writeJSON } = require('./helpers');
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
            this.browser = await puppeteer.launch({
                headless: this.__config.puppeteer.headless || true,
            });
        }

        return this;
    }

    exit() {
        return new Promise(async (resolve) => {
            if (this.browser) {
                await this.browser.close();
            }

            resolve();
        });
    }

    // Uncertain if newPage should return a new Promise... but how to do that
    // with an asychronous function?
    async newPage() {
        if (!this.browser) {
            await this.launch();
        }

        const page = await this.browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            if (request.resourceType() === 'document') {
                request.continue();
            } else {
                request.abort();
            }
        });

        page.on('close', (...args) => {
            console.log('Close page', ...args);
        });

        return page;
    }

    async getAllYears() {
        console.log('New page');
        const page = await this.newPage();
        console.log('Post page')
        await page.goto(this.libraryUrl);
        const data = await page.$$eval('.scrobble-table .table tbody tr', getScrobblesFromRows);
        await page.close();

        return new Promise((resolve) => resolve(data));
    }

    async save(data) {
        const filePath = path.resolve(__dirname, '..', 'data', this.username, this.__config.library_filename);
        const fileData = {
            created_at: new Date().toJSON(),
            items: data,
        };

        await writeJSON(filePath, fileData);
    }
}

module.exports = Scropple