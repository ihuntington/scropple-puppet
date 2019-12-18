const minimist = require('minimist');
const { isNil, zip } = require('../helpers');
const db = require('../import/db');
const spotify = require('./service');

function* makeUpdateTracksIterator(items) {
    let count = 0;
    while (count < items.length) {
        const item = items[count];
        yield db.updateTrackWithDuration(item.track_id, item.duration_ms, item.spotify_id);
        count += 1;
    }
}

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
    const tracks = await db.getTracksByDateWithoutDuration(...sortedDates);

    if (tracks.length === 0) {
        console.log('No tracks were played');
        process.exit(0);
    }

    await spotify.getAccessToken();
    const generator = makeFindTrackIterator(tracks);
    let tracksWithDuration = [];

    try {
        for await (let result of generator) {
            tracksWithDuration.push(result);
        }
    } catch (err) {
        console.log('Handle error');
        console.log(err);
    }

    const zipped = zip(tracks, tracksWithDuration)
        .map(([original, fromSpotify]) => ({
            track_id: original.track_id,
            artist_name: original.artist_name,
            track_name: original.track_name,
            duration_ms: fromSpotify.data.duration_ms,
            spotify_id: fromSpotify.data.spotify_id,
        }));
    const foundTracks = zipped.filter(({ spotify_id }) => !isNil(spotify_id));

    // This feels wrong but tired and cannot think of another approach here.
    for await (let track of makeUpdateTracksIterator(foundTracks)) {
        console.log('Update track', track);
    }

    const results = {
        found: foundTracks.length,
        not_found: zipped.length - foundTracks.length,
    };
    console.table(results);
    process.exit(0);
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
