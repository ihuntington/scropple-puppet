const minimist = require('minimist');
const pgp = require('pg-promise')();
const { isNil, zip } = require('../helpers');
const db = require('../import/db');
const sql = require('../import/sql');
const spotify = require('./spotify');
const connection = pgp({
    database: 'scrobbles',
    host: 'localhost',
    user: 'postgres',
    password: 'docker',
    port: 5432,
});

let excludeTracks = [];

function* makeFindTrackIterator(items) {
    let count = 0;
    while (count < items.length) {
        const item = items[count];
        yield spotify.findTrack(item.track_name, item.artist_name);
        count += 1;
    }
}

async function start(from, to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const sortedDates = [fromDate, toDate].sort((a, b) => a - b);

    if (excludeTracks.length === 0) {
        excludeTracks = [-1];
    }

    const tracks = await connection.any(sql.selectTracksWithoutSpotify, [...sortedDates, excludeTracks]);

    if (tracks.length === 0) {
        console.log('No tracks found between %s and %s', sortedDates[0], sortedDates[1]);
        process.exit(0);
    }

    if (isNil(spotify.accessToken)) {
        await spotify.getAccessToken();
    }

    let tracksWithDuration = [];

    try {
        for await (let result of makeFindTrackIterator(tracks)) {
            tracksWithDuration.push(result);
        }
    } catch (err) {
        console.log(err);
    }

    const zipped = zip(tracks, tracksWithDuration)
        .map(([original, fromSpotify]) => ({
            id: original.track_id,
            artist_name: original.artist_name,
            track_name: original.track_name,
            duration_ms: fromSpotify.data.duration_ms,
            spotify_id: fromSpotify.data.spotify_id,
        }));
    const foundTracks = zipped.filter(({ spotify_id }) => !isNil(spotify_id));
    const notFound = zipped.filter(({ spotify_id }) => isNil(spotify_id)).map(({ id }) => id);

    // eslint-disable-next-line require-atomic-updates
    excludeTracks = excludeTracks.concat(notFound);

    if (foundTracks.length === 0) {
        console.log('No matching tracks on Spotify');
        process.exit(1);
    }

    const tracksSet = new pgp.helpers.ColumnSet(['?id', 'duration_ms', 'spotify_id'], { table: 'tracks' });
    const updateQuery = pgp.helpers.update(foundTracks, tracksSet) + ' WHERE v.id = t.id';

    try {
        await connection.none(updateQuery);
    } catch (err) {
        console.log(err);
    }

    start(from, to);
}

if (module === require.main) {
    const { from, to } = minimist(process.argv);

    if (isNil(from) || isNil(to)) {
        console.log('--from and --to are required');
        process.exit(1);
    }

    start(from, to);
}

process.on('unhandledRejection', (err) => {
    console.log(err.stack);
    process.exit(1);
});
