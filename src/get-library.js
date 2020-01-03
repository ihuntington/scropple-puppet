'use strict';

const Scropple = require('./scropple-puppet');

async function start() {
    const scropple = new Scropple(require('../config.json'));

    await scropple.getLibrary();
    await scropple.exit();
}

module.exports = start;

if (module === require.main) {
    start();

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
