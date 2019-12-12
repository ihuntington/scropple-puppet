const fs = require('fs');
const path = require('path');
const { getScrobblesFromRows, readJSON, writeJSON } = require('./helpers');
const Scropple = require('./scropple-puppet');
const config = require('../config.json');

async function main() {
    const username = config.username;
    const scropple = new Scropple(username);
    const data = await scropple.getAllYears();

    const writePath = path.resolve(__dirname, '..', 'data', scropple.username, config.library_filename);
    await fs.promises.writeFile(writePath, JSON.stringify({ created_at: new Date().toJSON(), data }));
    await scropple.exit();


    // const library = await scropple.getYears();
    // const monthsFor2019 = await scropple.getMonthsByYear(2019);
    // await scropple.getMonth(1)
    // Always check the data folder first to see data is already saved
    // If date is today then skip checking the folder and get the data.
    // If date is in the future return nothing
    // If date is not cached then get month, if no month, then get year, if no year
    // then get library.
    // await scropple.getDate(2019-01-01);

    // console.log(library);
    // const srcPath = path.resolve(__dirname, '..', 'data', username, 'library.json');
    // const srcData = await readJSON(srcPath);
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();

    // await page.setRequestInterception(true);

    // page.on('request' , (request) => {
    //     if (request.resourceType() === 'document') {
    //         request.continue();
    //     } else {
    //         request.abort();
    //     }
    // });


}

main().catch((err) => {
    console.log(err);
});
