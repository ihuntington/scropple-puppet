const { Client } = require('pg');
const format = require('pg-format');
const sql = require('./sql');

const client = new Client({
    database: 'scrobbles',
    host: 'localhost',
    user: 'postgres',
    password: 'docker',
    port: 5432,
});

client.connect();

async function addArtist(artist) {
    let artistId;
    let result = await client.query(sql.artistExists, [artist]);

    if (result.rowCount === 0) {
        result = await client.query(sql.insertArtist, [artist]);
    }

    artistId = result.rows[0].id;

    return artistId;
}

async function addTrack(track) {
    let trackId;
    let result = await client.query(sql.trackExists, [track]);

    if (result.rowCount === 0) {
        result = await client.query(sql.insertTrack, [track]);
    }

    trackId = result.rows[0].id;

    return trackId;
}

async function addScrobble(trackId, timestamp) {
    let scrobbleId;
    let result = await client.query(sql.scrobbleExists, [trackId, timestamp]);

    if (result.rowCount === 0) {
        result = await client.query(sql.insertScrobble, [trackId, timestamp]);
    }

    scrobbleId = result.rows[0].id;

    return scrobbleId;
}

async function addArtistsTracks(artistId, trackId) {
    let artistTrack;
    let result = await client.query(sql.artistTrackExists, [artistId, trackId]);

    if (result.rowCount === 0) {
        result = await client.query(sql.insertArtistTrack, [artistId, trackId]);
    }

    artistTrack = result.rows[0];

    return artistTrack;
}

async function getTracksByDateWithoutDuration(fromDate, toDate) {
    const result = await client.query(sql.selectTracksWithoutDurationByDate, [fromDate, toDate]);

    if (result.rowCount === 0) {
        return [];
    }

    return result.rows;
}

async function updateTrackWithDuration(id, duration, spotifyId) {
    const result = await client.query(sql.updateTrackWithDuration, [id, duration, spotifyId]);

    return result.rows[0];
}

async function getAllTracksWithSpotifyId(limit = 100, offset = 0) {
    const result = await client.query(sql.selectTracksWithSpotifyId, [limit, offset]);

    if (result.rowCount === 0) {
        return {
            limit,
            offset,
            total: 0,
            rows: [],
        };
    }

    return {
        limit,
        offset,
        total: parseInt(result.rows[0].total_count, 10),
        rows: result.rows.map(({ id, spotify_id }) => ({ id, spotify_id })),
    };
}

async function addTrackAudioFeatures(tracks) {
    const result = await client.query(format(sql.insertTrackAudioFeatures, tracks));
    return result;
}

module.exports = {
    addArtist,
    addArtistsTracks,
    addScrobble,
    addTrack,
    addTrackAudioFeatures,
    getAllTracksWithSpotifyId,
    getTracksByDateWithoutDuration,
    updateTrackWithDuration,
};
