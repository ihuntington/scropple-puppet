const request = require('request');
const spotifyId = process.env.SPOTIFY_ID;
const spotifyClient = process.env.SPOTIFY_CLIENT;
const basicToken = Buffer.from(`${spotifyId}:${spotifyClient}`).toString('base64');
const statusCodes = {
    RATE_LIMIT: 429
};

let accessToken;

function getAccessToken() {
    const options = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'POST',
        headers: {
            Authorization: `Basic ${basicToken}`,
        },
        form: {
            grant_type: 'client_credentials',
        },
    };

    return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) {
                return reject(err);
            }

            const parsedBody = JSON.parse(body);
            accessToken = parsedBody.access_token;

            resolve();
        });
    });
}

function findTrack(trackName, artistName) {
    const options = {
        url: 'https://api.spotify.com/v1/search',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        qs: {
            q: `${trackName} artist:${artistName}`,
            type: 'track',
            limit: 10,
        }
    };
    const data = {
        track: trackName,
        artist: artistName,
        duration_ms: null,
        spotify_id: null,
    };

    return new Promise((resolve, reject) => {
        request(options, async (err, response, body) => {
            if (err) {
                console.error(err);
                return reject();
            }

            // TODO: Refactor
            if (response.statusCode === statusCodes.RATE_LIMIT) {
                const retryAfter = response.headers['retry-after'];
                console.log(`Spotify rate limit exceeded. Retry after ${retryAfter}s.`);

                return reject({
                    status: 'NOT_FOUND',
                    data,
                });
            }

            let json;

            try {
                json = JSON.parse(body);
            } catch (err) {
                console.log('JSON parse error', options);
                return reject({
                    status: 'NOT_FOUND',
                    data,
                });
            }

            if (json.tracks.items && json.tracks.items.length === 0) {
                console.log(`Not found track ${trackName} by ${artistName}`);
                return resolve({
                    status: 'NOT_FOUND',
                    data,
                });
            }

            const topResult = json.tracks.items[0];
            const artistMatch = topResult.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());

            // There are other scenarions to catch here such as T'Pau example
            if (artistMatch) {
                console.log('Found matching track', artistName, trackName);

                data.duration_ms = topResult.duration_ms;
                data.spotify_id = topResult.id;
            }

            return resolve({
                status: 'FOUND',
                data,
            });
        });
    });
}

function getAudioFeatures(ids) {
    const options = {
        url: 'https://api.spotify.com/v1/audio-features',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        qs: {
            ids: ids.join(','),
        },
    };

    return new Promise((resolve, reject) => {
        request(options, async (err, response, body) => {
            if (err) {
                console.log('Error audio features', err);
                return reject(err);
            }

            if (response.statusCode === statusCodes.RATE_LIMIT) {
                console.log('Hit rate limit');
                return reject();
            }

            console.log('Success - Audio features');
            let json = JSON.parse(body);

            return resolve(json.audio_features);
        });
    });
}

module.exports = {
    getAccessToken,
    findTrack,
    getAudioFeatures
}
