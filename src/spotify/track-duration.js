const pgp = require('pg-promise')();
const sql = require('../import/sql');
const client = pgp({
    database: 'scrobbles',
    host: 'localhost',
    user: 'postgres',
    password: 'docker',
    port: 5432,
});

function getTracksByDate(date) {
    return client.query(sql.selectTracksByDate, [date]);
}

async function main() {
    let tracks;

    try {
        tracks = await getTracksByDate('2019-02-25');
    } catch (err) {
        console.log(err);
    }

    let tracksWithPlayEnd = tracks.map((track, index, arr) => {
        const start = track.played_at.valueOf();

        let end;
        let nextTrack;
        let skipped = false;

        if ((index + 1) !== arr.length) {
            nextTrack = arr[index + 1];

            if (start === nextTrack.played_at.valueOf()) {
                skipped = true;
                end = track.played_at;
            } else {
                let endMinutes = new Date(start + track.duration_ms).getMinutes();
                let nextStartMinutes = nextTrack.played_at.getMinutes();

                end = new Date(start + track.duration_ms);

                if (endMinutes === nextStartMinutes) {
                    end.setSeconds(0);
                }
            }
        } else {
            end = new Date(start + track.duration_ms);
        }

        return {
            ...track,
            played_end: end,
            skipped,
        };
    });

    console.log(tracksWithPlayEnd);
}

main();
