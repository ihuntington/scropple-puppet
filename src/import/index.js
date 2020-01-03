const path = require('path');
const klaw = require('klaw');
const minimist = require('minimist');
const db = require('./db');
const sql = require('../import/sql');
const { excludeDirFilter, excludeFile, includeJsonFilter, readJSON } = require('../helpers');

// TODO: this should really be part of the Last.fm scraper
function createTimestamp(originalTimestamp) {
    const [dirtyDate, dirtyTime] = originalTimestamp.split(',');
    const pattern = /(\d{1,2}):(\d{1,2})(am|pm)/;
    const test = dirtyTime.match(pattern);
    const date = new Date(dirtyDate);
    const period = test[3];
    const parsedHour = parseInt(test[1], 10);
    const parsedMins = parseInt(test[2], 10);
    let hour = parsedHour;

    if (period === 'pm' && parsedHour !== 12) {
        hour = hour + 12
    }

    date.setHours(hour, parsedMins);

    return date;
}

async function getInsertArtist(task, artistName) {
    const artist = await task.oneOrNone(sql.selectArtistByName, artistName);
    return artist || await task.one(sql.insertArtist, artistName);
}

async function getInsertScrobble(task, trackId, timestamp) {
    const scrobble = await task.oneOrNone(sql.selectExistingScrobble, [trackId, timestamp]);
    return scrobble || await task.one(sql.insertScrobble, [trackId, timestamp]);
}

async function importTrack(item) {
    console.log('Import track %s by %s', item.name, item.artist.name);

    return new Promise((resolve) => {
        db.client.task('import-scrobble', async (task) => {
            const existingTrack = await task.oneOrNone(sql.trackExists, [item.name, item.artist.name]);
            let artist;
            let track;

            if (!existingTrack) {
                artist = await getInsertArtist(task, item.artist.name);
                track = await task.one(sql.insertTrack, item.name);

                // Add artist and track to junction table
                await task.none(sql.insertArtistTrack, [artist.id, track.id]);

            } else {
                artist = {
                    id: existingTrack.artist_id,
                    name: existingTrack.artist_name,
                };
                track = {
                    id: existingTrack.track_id,
                    name: existingTrack.track_name,
                };
            }

            const timestamp = createTimestamp(item.timestamp);
            const scrobble = await getInsertScrobble(task, track.id, timestamp);

            return {
                status: 'success',
                artist,
                track,
                scrobble,
            }
        })
        // Note: pg-promise is internally releasing the connection so have to
        // use a thenable after to resolve the data
        .then((data) => resolve(data))
        .catch((err) => {
            console.log('Error: %s by %s', item.name, item.artist.name);
            console.log(err.message);
            resolve({
                status: 'error',
                item,
                error: err.message,
            });
        });
    });
}

function* makeImportIterator(fileData) {
    const { items } = fileData;
    let count = 0;
    while (count < items.length) {
        yield importTrack(items[count]);
        count++;
    }
}

async function* makeReadFileIterator(files) {
    let count = 0;
    while (count < files.length) {
        const fileData = await readJSON(files[count]);
        yield* makeImportIterator(fileData);
        count++;
    }
}

async function main(files) {
    const fileGenerator = makeReadFileIterator(files);
    const issues = [];
    let count = 0;

    // TODO: this does not seem like the right pattern to me
    for await (let result of fileGenerator) {
        if (result.status === 'error') {
            issues.push(result);
        } else {
            count += 1;
        }
    }

    console.log('Successfully imported %s tracks', count);
    console.log('There were %s issues', issues.length);
}

function start() {
    const { data } = minimist(process.argv);
    const inputPath = path.resolve(process.cwd(), data);
    const files = [];

    klaw(inputPath)
        .pipe(excludeDirFilter)
        .pipe(includeJsonFilter)
        .pipe(excludeFile('index.json'))
        .on('readable', function () {
            let file;
            // eslint-disable-next-line no-cond-assign
            while (file = this.read()) {
                files.push(file.path);
            }
        })
        .on('end', function () {
            main(files);
        });
}

if (module === require.main) {
    start();

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
