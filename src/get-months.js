const path = require('path');
const minimist = require('minimist');
const klaw = require('klaw');
const config = require('../config.json');
const Scropple = require('./scropple-puppet');
const { excludeDirFilter, excludeFile, includeJsonFilter, isNil, readJSON } = require('./helpers');

async function* makeScrapePagesIterator(scropple, pages) {
    let count = 0;
    while (count < pages.length) {
        const items = await scropple.getListeningHistory(pages[count].url);
        const data = {
            ...pages[count],
            items,
        }
        yield data;
        count++;
    }
}

async function* makeReadFilesIterator(scropple, files, month) {
    let count = 0;
    while (count < files.length) {
        const fileData = await readJSON(files[count]);
        let items = [];

        if (!isNil(month)) {
            items = fileData.items.filter((item) => {
                const date = new Date(item.date);
                return date.getMonth() === month;
            });
        } else {
            items = fileData.items.filter((item) => item.scrobbles > 0);
        }

        // TODO: What should happen in this scenario... if anything.
        // if (items.length === 0) {
        //     return;
        // }

        yield* makeScrapePagesIterator(scropple, items);
        count++;
    }
}

async function main(files, targetMonth) {
    const scropple = new Scropple(config);
    const generator = makeReadFilesIterator(scropple, files, targetMonth);

    for await (let result of generator) {
        const date = new Date(result.date);
        const year = date.getFullYear();
        // Increase month by one so January = 1 etc
        const month = date.getMonth() + 1;
        const data = {
            created_at: new Date().toJSON(),
            url: result.url,
            items: result.items,
        };

        // TODO: does this need to have await?
        await scropple.saveMonth(year.toString(), month.toString(), data);
    }

    await scropple.exit();

    console.log('Finished scraping months');
}

function readAllYears() {
    const dataPath = path.resolve(__dirname, '..', 'data', config.username);
    const files = [];

    klaw(dataPath, { depthLimit: 1 })
        .pipe(excludeDirFilter)
        .pipe(includeJsonFilter)
        .pipe(excludeFile('library.json'))
        .on('readable', function () {
            let file;
            // eslint-disable-next-line no-cond-assign
            while (file = this.read()) {
                files.push(file.path);
            }
        })
        .on('end', () => {
            main(files);
        });
}

async function readYear(year, month) {
    const filePath = path.resolve(__dirname, '..', 'data', config.username, `${year}.json`);
    let targetMonth;

    if (month) {
        targetMonth = month - 1;
    }

    main([filePath], targetMonth);
}

function start(year, month) {
    if (!year) {
        readAllYears();
    } else {
        readYear(year, month)
    }
}

module.exports = start;

if (module === require.main) {
    const { year, month } = minimist(process.argv);

    start(year, month);

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
