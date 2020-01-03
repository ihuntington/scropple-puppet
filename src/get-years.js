const minimist = require('minimist');
const Scropple = require('./scropple-puppet');

async function start(year) {
    const scropple = new Scropple(require('../config.json'));

    await scropple.getYears(year);
    await scropple.exit();
}

module.exports = start;

if (module === require.main) {
    const { year } = minimist(process.argv);

    start(year);

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
