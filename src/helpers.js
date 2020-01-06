const fs = require('fs');
const path = require('path');
const through2 = require('through2');

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
    readJSON,
    writeJSON,
    zip,
};
