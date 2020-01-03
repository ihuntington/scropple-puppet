const pgp = require('pg-promise')();
const sql = require('./sql');

const client = pgp({
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function getTracksByDateWithoutDuration(fromDate, toDate, limit = 50) {
    const result = await client.query(sql.selectTracksWithoutDurationByDate, [fromDate, toDate, limit]);

    if (result.rowCount === 0) {
        return [];
    }

    return result.rows;
}

async function updateTrackWithDuration(id, duration, spotifyId) {
    const result = await client.query(sql.updateTrackWithDuration, [id, duration, spotifyId]);

    return result.rows[0];
}

// TODO: Review / refactor for pg-promise
// async function getAllTracksWithSpotifyId(limit = 100, offset = 0) {
//     const result = await client.query(sql.selectTracksWithSpotifyId, [limit, offset]);

//     if (result.rowCount === 0) {
//         return {
//             limit,
//             offset,
//             total: 0,
//             rows: [],
//         };
//     }

//     return {
//         limit,
//         offset,
//         total: parseInt(result.rows[0].total_count, 10),
//         rows: result.rows.map(({ id, spotify_id }) => ({ id, spotify_id })),
//     };
// }

// async function addTrackAudioFeatures(tracks) {
//     const result = await client.query(format(sql.insertTrackAudioFeatures, tracks));
//     return result;
// }

function updateTracksWithDurationAndSpotifyId(tracks) {
    const iffy = (items) => items.reduce((prev, [id, duration, sid]) => {
        return [...prev, `(${id}, ${duration}, '${sid}')`];
    }, []);

    const iffyTracks = iffy(tracks).join(',');
    return client.query(sql.updateTracksWithDurationAndSpotifyId, [iffyTracks]);
}

module.exports = {
    // addTrackAudioFeatures,
    // getAllTracksWithSpotifyId,
    getTracksByDateWithoutDuration,
    updateTrackWithDuration,
    updateTracksWithDurationAndSpotifyId,
    client,
};
