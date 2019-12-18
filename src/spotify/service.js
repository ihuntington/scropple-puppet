const request = require('request');
const { delay } = require('../helpers');
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
                return reject();
            }

            // TODO: need to refactor so that this file only does the requests
            if (response.statusCode === statusCodes.RATE_LIMIT) {
                console.log(`Spotify rate limit exceeded. Retry after ${retryAfter}`);
                const retryAfter = response.headers['retry-after'];

                await delay(1000 * retryAfter);

                return reject({
                    status: 'NOT_FOUND',
                    data,
                });
            }

            const { tracks } = JSON.parse(body);

            if (tracks.items.length === 0) {
                console.log(`Not found track ${trackName} by ${artistName}`);
                return resolve({
                    status: 'NOT_FOUND',
                    data,
                });
            }

            const topResult = tracks.items[0];
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
        request(options, (err, response, body) => {
            if (err) {
                console.log(err);
                return reject();
            }

            // Should check response error codes for rate limiting and handle
            // what should then happen

            const results = JSON.parse(body);

            resolve(results);
        });
    });
}


module.exports = {
    getAccessToken,
    findTrack,
    getAudioFeatures
}