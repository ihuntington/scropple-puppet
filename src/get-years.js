const minimist = require('minimist');
const Scropple = require('./scropple-puppet');

async function start() {
    const { year } = minimist(process.argv);
    const scropple = new Scropple(require('../config.json'));

    await scropple.getYears(year);
    await scropple.exit();
}

if (module === require.main) {
    start();

    process.on('unhandledRejection', (err) => {
        console.log(err);
    });
}
