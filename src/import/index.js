const path = require('path');
const klaw = require('klaw');
const minimist = require('minimist');
// const { Client } = require('pg');
const db = require('./db');
const { excludeDirFilter, excludeFile, includeJsonFilter, readJSON } = require('../helpers');
// const sql = require('./sql');

// const client = new Client({
//     database: 'scrobbles',
//     host: 'localhost',
//     user: 'postgres',
//     password: 'docker',
//     port: 5432,
// });

// client.connect();

// async function addArtist(artist) {
//     let artistId;
//     let result = await client.query(sql.artistExists, [artist]);

//     if (result.rowCount === 0) {
//         result = await client.query(sql.insertArtist, [artist]);
//     }

//     artistId = result.rows[0].id;

//     return artistId;
// }

// async function addTrack(track) {
//     let trackId;
//     let result = await client.query(sql.trackExists, [track]);

//     if (result.rowCount === 0) {
//         result = await client.query(sql.insertTrack, [track]);
//     }

//     trackId = result.rows[0].id;

//     return trackId;
// }

// async function addScrobble(trackId, timestamp) {
//     let scrobbleId;
//     let result = await client.query(sql.scrobbleExists, [trackId, timestamp]);

//     if (result.rowCount === 0) {
//         result = await client.query(sql.insertScrobble, [trackId, timestamp]);
//     }

//     scrobbleId = result.rows[0].id;

//     return scrobbleId;
// }

// async function addArtistsTracks(artistId, trackId) {
//     let artistTrack;
//     let result = await client.query(sql.artistTrackExists, [artistId, trackId]);

//     if (result.rowCount === 0) {
//         result = await client.query(sql.insertArtistTrack, [artistId, trackId]);
//     }

//     artistTrack = result.rows[0];

//     return artistTrack;
// }

function createTimestamp(scrobbleDate, trackTimestamp) {
    const pattern = /(\d{1,2}):(\d{1,2})(am|pm)/;
    const test = trackTimestamp.match(pattern);
    const date = new Date(scrobbleDate);
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

async function importItem(scrobbleDate, item) {
    console.log('import item', item);
    const timestamp = createTimestamp(scrobbleDate, item.timestamp)
    const artistId = await db.addArtist(item.artist.name)
    const trackId = await db.addTrack(item.name);

    // Add artist and track to junction table
    await db.addArtistsTracks(artistId, trackId);

    const scrobble = await db.addScrobble(trackId, timestamp);

    return new Promise((resolve) => resolve(scrobble));
}

function* makeImportIterator(data) {
    const { date , items } = data;
    let count = 0;
    while (count < items.length) {
        yield importItem(date, items[count]);
        count++;
    }
}

async function* makeReadFileIterator(files) {
    for (let file of files) {
        const data = await readJSON(file);
        yield* makeImportIterator(data);
    }
}

async function main(files) {
    const fileGenerator = makeReadFileIterator(files);

    for await (let result of fileGenerator) {
        console.log('Done importing:', result);
    }

    process.exit();
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
}