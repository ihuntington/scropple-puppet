const path = require('path');
// const minimist = require('minimist');
const klaw = require('klaw');
const config = require('../config.json');
const Scropple = require('./scropple-puppet');
const { excludeDirFilter, excludeFile, includeJsonFilter, readJSON } = require('./helpers');

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

async function* makeReadFilesIterator(scropple, files) {
    let count = 0;
    while (count < files.length) {
        const fileData = await readJSON(files[count]);
        const items = fileData.items.filter((item) => item.scrobbles > 0);
        yield* makeScrapePagesIterator(scropple, items);
        count++;
    }
}

async function main(files) {
    const scropple = new Scropple(config);
    const generator = makeReadFilesIterator(scropple, files);

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

    console.log('Finished scraping months');

    await scropple.exit();

    process.exit(0);
}

function start() {
    // const { year, month } = minimist(process.argv);
    const userPath = path.resolve(__dirname, '..', 'data', config.username);
    const files = [];

    let dataPath;
    // TODO: think how to filter out only desired file and then which generator
    // to call. A little more complex thant I originally thought hmmm.
    // if (year) {
    //     dataPath = path.resolve(userPath, year.toString());
    // } else if (year && month) {
    //     dataPath = path.resolve(userPath, year.toString(), month.toString());
    // } else {
    //     dataPath = userPath;
    // }

    // TODO: Just for now get all years e.g. 2006.json, 2007.json
    dataPath = userPath;

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
            // console.log(files);
            main(files);
        });
}

if (module === require.main) {
    start();
}
