const fs = require('fs');
const path = require('path');
const through2 = require('through2');

// TODO: rename function as it is for library history table
function getScrobblesFromRows(elements) {
    return new Promise((resolve) => {
        const data = elements.map((row) => {
            // `row.cells` is an HTMLCollection so convert to an Array
            return Array.from(row.cells).map((cell, index) => {
                if (index === 0) {
                    return {
                        url: cell.firstElementChild.href,
                        date: new Date(parseInt(cell.dataset.timestamp, 10) * 1000).toJSON(),
                    };
                }

                return {
                    scrobbles: parseInt(cell.textContent.trim(), 10)
                };
            }).reduce((a, b) => Object.assign(a, b));
        });

        resolve(data);
    });
}

// An idea:
// Would this be better with a zip approach as could use browser to request the
// name, artist and timestap individually in three arrays. Then merge those arrays
// into an array of objects with properties from the source arrays. As long as each
// array is the same length.

// elements [HTMLCollection]
function getTracksFromChartList(elements) {
    return new Promise((resolve) => {
        const data = Array.from(elements).map((row) => {
            const $name = row.querySelector('.chartlist-name a');
            const $artist = row.querySelector('.chartlist-artist a');
            const $timestamp = row.querySelector('.chartlist-timestamp span');

            return {
                name: $name.textContent,
                url: $name.href,
                artist: {
                    name: $artist.textContent,
                    url: $artist.href,
                },
                timestamp: $timestamp.title,
            };
        });

        resolve(data);
    });
}

async function readJSON(filePath) {
    let result;

    try {
        const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
        result = JSON.parse(file);
    } catch (error) {
        result = null;
    }

    return new Promise((resolve) => {
        resolve(result);
    });
}

function writeJSON(filepath, data) {
    const stringified = JSON.stringify(data);
    const directory = path.dirname(filepath);

    return fs.promises.mkdir(directory, { recursive: true })
        .then(() => {
            fs.promises.writeFile(filepath, stringified);
        });
}

const includeFile = (filename) => through2.obj(function (item, enc, next) {
    if (path.basename(item.path) === filename) {
        this.push(item);
    }

    next();
});

const excludeFile = (filename) => through2.obj(function (item, enc, next) {
    if (path.basename(item.path) !== filename) {
        this.push(item);
    }

    next();
});

const excludeDirFilter = through2.obj(function (item, enc, next) {
    if (!item.stats.isDirectory()) {
        this.push(item);
    }

    next();
});

const includeJsonFilter = through2.obj(function (item, enc, next) {
    if (path.extname(item.path) === '.json') {
        this.push(item);
    }

    next();
});

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function isNil(x) {
    return x == null;
}

function zip(a, b) {
    const zippedArray = [];
    const length = Math.min(a.length, b.length);
    let index = 0;

    while (index < length) {
        zippedArray[index] = [a[index], b[index]];
        index += 1;
    }

    return zippedArray;
}

module.exports = {
    delay,
    excludeDirFilter,
    excludeFile,
    includeFile,
    includeJsonFilter,
    isNil,
    getScrobblesFromRows,
    getTracksFromChartList,
    readJSON,
    writeJSON,
    zip,
};
