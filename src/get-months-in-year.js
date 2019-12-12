const Scropple = require('./scropple-puppet');
const config = require('../config.json');

async function start() {
    const scropple = new Scropple(config);

    await scropple.getYears();
    await scropple.exit()

    console.log('Done');
    process.exit(0);
}

if (module === require.main) {
    start().catch((err) => {
        console.log(err.stack);
        process.exit(1);
    });
}
