const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const config = require('../config.json');

// The "const" keyword means constant, in that the value assigned to it cannot be changed.

// The "async" keyword in front of "function" means that the function will contain
// asynchronous functions that must be allowed to complete before the next line of
// code is executed.

// The "await" keyword identifies that the function we call after it is asynchronous

async function main() {
    // Launch a Chromium browser
    const browser = await puppeteer.launch();

    // Create a new page with a default browser context
    const page = await browser.newPage();

    // Enable request interception so we can access .continue and .abort
    await page.setRequestInterception(true);

    // Listen for "request" events
    page.on('request', (request) => {

        // We are only interested in the document...
        if (request.resourceType() === 'document') {
            // ...so allow the document request to continue...
            request.continue();

        // ...otherwise abort all other requests
        } else {
            request.abort();
        }
    });

    // Create the URL that we want to visit in the browser. We are going to replace
    // the string <username> with the value of the key "username" defined in the config file.
    const url = new URL(config.library_url.replace(/<username>/, config.username));

    // Go to the URL
    await page.goto(url);

    // Get the data from the "Listening History" table
    const scrobbles = await page.$$eval(config.selectors.scrobble_table_rows, (elements) => {
        return new Promise((resolve) => {
            const data = elements.map((row) => {
                // `row.cells` is an HTMLCollection so convert to an Array
                return Array.from(row.cells).map((cell, index) => {
                    if (index === 0) {
                        return {
                            url: cell.firstElementChild.href,
                            year: new Date(parseInt(cell.dataset.timestamp, 10) * 1000).toJSON(),
                        };
                    }

                    return {
                        scrobbles: parseInt(cell.textContent.trim(), 10)
                    };
                }).reduce((a, b) => Object.assign(a, b));
            });

            resolve(data);
        });
    });

    const outputPath = path.resolve(__dirname, '..', config.listening_history_output);
    const fileData = {
        created_at: new Date().toJSON(),
        data: scrobbles,
    };

    fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 4));

    await browser.close();
}

// Call the main function above
main();
