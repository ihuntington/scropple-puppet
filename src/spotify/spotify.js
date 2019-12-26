const request = require('request');
const { delay } = require('../helpers');

const statusCodes = {
    RATE_LIMIT: 429
};

class Spotify {
    constructor() {
        this._accessToken = null;

        return this;
    }

    __makeRequest(options, cb) {
        request(options, async (err, response, body) => {
            if (err) {
                return cb(err);
            }

            if (response.statusCode === statusCodes.UNAUTHORIZED) {
                console.log('Unauthorized request');
                await this.getAccessToken();
                return this.__makeRequest(options, cb);
            }

            if (response.statusCode === statusCodes.RATE_LIMIT) {
                const retryAfter = parseInt(response.headers['retry-after'], 10);
                console.log(`Spotify rate limit exceeded. Retry again in ${retryAfter}s`);
                await delay(1000 * retryAfter);
                return this.__makeRequest(options, cb);
            }

            let json;

            try {
                json = JSON.parse(body);
            } catch (err) {
                return cb(err, response);
            }

            return cb(null, response, json);
        });
    }

    set accessToken(token) {
        this._accessToken = token;
    }

    get accessToken() {
        return this._accessToken;
    }

    get basicToken() {
        const { SPOTIFY_ID, SPOTIFY_CLIENT} = process.env;
        const token = Buffer.from(`${SPOTIFY_ID}:${SPOTIFY_CLIENT}`).toString('base64');
        return token;
    }

    getAccessToken() {
        const options = {
            url: 'https://accounts.spotify.com/api/token',
            method: 'POST',
            headers: {
                Authorization: `Basic ${this.basicToken}`,
            },
            form: {
                grant_type: 'client_credentials',
            },
        };

        return new Promise((resolve, reject) => {
            this.__makeRequest(options, (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                this.accessToken = body.access_token;

                resolve();
            });
        });
    }

    search(query, type) {
        const options = {
            url: 'https://api.spotify.com/v1/search',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
            qs: {
                q: query,
                type,
                limit: 10,
            }
        };

        return new Promise((resolve, reject) => {
            this.__makeRequest(options, (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                resolve(body);
            });
        });
    }

    findTrack(trackName, artistName) {
        const query = `${trackName} artist:${artistName}`;
        const data = {
            track: trackName,
            artist: artistName,
            duration_ms: null,
            spotify_id: null,
        };

        return new Promise((resolve, reject) => {
            this.search(query, 'track')
                .then(({ tracks }) => {
                    if (tracks.items.length === 0) {
                        console.log(`Could not find the track ${trackName} by ${artistName}`);
                        return resolve({
                            status: 'NOT_FOUND',
                            data,
                        });
                    }

                    const topResult = tracks.items[0];
                    const match = topResult.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());

                    // There are other scenarions to catch here such as T'Pau example
                    if (match) {
                        console.log('Found track %s by %s', artistName, trackName);

                        data.duration_ms = topResult.duration_ms;
                        data.spotify_id = topResult.id;
                    }

                    return resolve({
                        status: 'FOUND',
                        data,
                    });
                })
                .catch((err) => {
                    console.error(err);
                    reject({
                        status: 'NOT_FOUND',
                        data,
                    });
                });
        });
    }
}

module.exports = new Spotify();
