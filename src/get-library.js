const Scropple = require('./scropple-puppet');
const config = require('../config.json');

async function start() {
    const scropple = new Scropple(config);
    await scropple.getLibrary();
    await scropple.exit();

    process.exit(0);
}

start().catch((err) => {
    console.log(err.stack);
});
