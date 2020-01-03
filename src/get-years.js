const minimist = require('minimist');
const Scropple = require('./scropple-puppet');
const config = require('../config.json');

async function start() {
    const { year } = minimist(process.argv);
    const scropple = new Scropple(config);

    await scropple.getYears(year);
    await scropple.exit();

    process.exit(0);
}

if (module === require.main) {
    start().catch((err) => {
        console.log(err.stack);
        process.exit(1);
    });
}
