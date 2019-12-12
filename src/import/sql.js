const sql = {
    artistExists: `
        SELECT id FROM artists
        WHERE name = $1
    `,
    insertArtist: `
        INSERT INTO artists(name) VALUES($1) RETURNING id
    `,
    trackExists: `
        SELECT id FROM tracks
        WHERE name = $1
    `,
    insertTrack: `
        INSERT INTO tracks(name) VALUES($1) RETURNING id
    `,
    scrobbleExists: `
        SELECT id FROM scrobbles
        WHERE track_id = $1
        AND played_at = $2
    `,
    insertScrobble: `
        INSERT INTO scrobbles(track_id, played_at) VALUES($1, $2) RETURNING id
    `,
    artistTrackExists: `
        SELECT * FROM artists_tracks
        WHERE artist_id = $1
        AND track_id = $2
    `,
    insertArtistTrack: `
        INSERT INTO artists_tracks(artist_id, track_id) VALUES($1, $2) RETURNING *
    `
};

module.exports = sql;
