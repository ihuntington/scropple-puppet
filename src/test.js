const fs = require('fs');

async function main() {
    let dir = await fs.promises.readdir('./data/BobbyParkhurst/2019');
    console.log(dir)
}

if (module === require.main) {
    main();
}