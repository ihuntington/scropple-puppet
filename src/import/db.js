const { Client } = require('pg');
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

module.exports = {
    addArtist,
    addArtistsTracks,
    addScrobble,
    addTrack,
    getTracksByDateWithoutDuration,
    updateTrackWithDuration,
};
