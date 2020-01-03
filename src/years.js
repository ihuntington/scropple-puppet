const Scropple = require('./scropple-puppet');
const config = require('../config.json');

async function start() {
    const scropple = new Scropple(config);
    const data = await scropple.getAllYears();

    await scropple.save(data);
    await scropple.exit();

    process.exit(0);
}

start().catch((err) => {
    console.log(err.stack);
});
