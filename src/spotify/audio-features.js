const db = require('../import/db.js');
const spotify = require('./service');
const { isNil, zip } = require('../helpers');

function filterItemsWithAudioFeatures(items) {
    return items.filter((item) => !isNil(item[1]));
}

async function start() {
    const result = await db.getAllTracksWithSpotifyId();
    const totalRecords = result.total;

    if (totalRecords === 0) {
        console.log('No tracks found with a Spotify ID');
        process.exit(0);
    }

    const tracks = result.rows;
    const spotifyIds = tracks.map(({ spotify_id }) => spotify_id);

    await spotify.getAccessToken();

    spotify.getAudioFeatures(spotifyIds)
        .then((audioFeatures) => {
            return zip(tracks, audioFeatures);
        })
        .then(filterItemsWithAudioFeatures)
        .then((items) => {
            return items.map(([track, features]) => ([
                track.id,
                features.acousticness,
                features.danceability,
                features.energy,
                features.instrumentalness,
                features.liveness,
                features.loudness,
                features.speechiness,
                features.valence,
                features.time_signature,
                features.tempo,
            ]));
        })
        .then((items) => {
            console.log('Add audio features to database');
            return db.addTrackAudioFeatures(items);
        })
        .then((result) => {
            console.log(`Successfully inserted ${result.rowCount} records into track_audio_features table`);

            if (totalRecords > result.rows.length) {
                console.log('Get next set of records');
                return start();
            }

            process.exit(0);
        })
        .catch((err) => {
            console.log('There was an error');
            console.log(err);
            process.exit(1);
        });
}

if (module === require.main) {
    start();
}

process.on('unhandledRejection', (err) => {
    console.log(err.stack);
    process.exit(1);
});
