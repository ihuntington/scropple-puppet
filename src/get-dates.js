const path = require('path');
const minimist = require('minimist');
const klaw = require('klaw');
const config = require('../config.json');
const Scropple = require('./scropple-puppet');
const { excludeDirFilter, includeFile, includeJsonFilter, readJSON, writeJSON } = require('./helpers');

function* makeScraperIterator(scropple, items) {
    let count = 0;
    while (count < items.length) {
        yield scropple.getChartlist(items[count]);
        count++;
    }
}

async function* makeReadFileIterator(scropple, files) {
    let count = 0;
    while (count < files.length) {
        const fileData = await readJSON(files[count]);
        const items = fileData.items.filter((item) => item.scrobbles !== 0);
        yield* makeScraperIterator(scropple, items);
        count++;
    }
}

async function readYears(files) {
    const scropple = new Scropple(config);
    const generator = makeReadFileIterator(scropple, files);

    let failedRequests = [];

    for await (let result of generator) {
        if (result.fail.length > 0) {
            failedRequests = failedRequests.concat(result.fail);
        }

        if (result.success.length > 0) {
            const items = result.success.reduce((previous, current) => {
                return previous.concat(current.items);
            }, []);
            const datestamp = new Date(result.date);
            const year = datestamp.getFullYear().toString();
            const month = (datestamp.getMonth() + 1).toString();
            const date = datestamp.getDate().toString();
            const fileData = {
                created_at: new Date().toJSON(),
                date: result.date,
                items,
            };
            await scropple.saveDate(year, month, date, fileData);
        }
    }

    const now = Date.now().toString();
    const errorLogPath = path.resolve(__dirname, '..', `errors-${now}.json`);
    await writeJSON(errorLogPath, { failedRequests });

    await scropple.exit();
}

async function start(year, month) {
    const userPath = path.resolve(__dirname, '..', 'data', config.username);
    let dataPath;

    if (!year) {
        console.log('You must specify a year');
        return;
    }

    if (year && month) {
        dataPath = path.resolve(userPath, year.toString(), month.toString());
    } else {
        dataPath = path.resolve(userPath, year.toString());
    }

    const files = [];

    klaw(dataPath)
        .pipe(excludeDirFilter)
        .pipe(includeJsonFilter)
        .pipe(includeFile('index.json'))
        .on('readable', function () {
            let file;
            // eslint-disable-next-line no-cond-assign
            while (file = this.read()) {
                files.push(file.path);
            }
        })
        .on('end', () => {
            // console.log(files);
            readYears(files);
        });
}

if (module === require.main) {
    const { year, month } = minimist(process.argv);

    start(year, month);

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
