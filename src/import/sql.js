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
    `,
    insertTrackAudioFeatures: `
        INSERT INTO track_audio_features(track_id, acousticness, danceability, energy, instrumentalness, liveness, loudness, speechiness, valence, time_signature, tempo) VALUES %L
    `,
    selectTracksWithoutDurationByDate: `
        SELECT DISTINCT sc.track_id, ar.name as artist_name, tr.name as track_name FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE CAST(sc.played_at AS DATE) BETWEEN $1 AND $2
        AND tr.duration_ms IS NULL
        AND tr.spotify_id IS NULL
    `,
    selectTracksWithSpotifyId: `
        SELECT id, spotify_id, COUNT(*) OVER() as total_count FROM tracks
        WHERE duration_ms IS NOT NULL
        AND spotify_id IS NOT NULL
        LIMIT $1 OFFSET $2
    `,
    updateTrackWithDuration: `
        UPDATE tracks
        SET duration_ms = $2, spotify_id = $3
        WHERE id = $1
        RETURNING id;
    `
};

module.exports = sql;
