function getListeningHistoryScrobbles(rows) {
    return rows.map((row) => {
        const cells = row.cells;
        const timestamp = parseInt(cells[0].dataset.timestamp, 10);
        const url = cells[0].firstElementChild.href;
        const scrobbles = parseInt(cells[1].textContent.trim(), 10);

        return {
            url,
            scrobbles,
            // timestamp in last.fm is in seconds so convert to milliseconds
            date: new Date(timestamp * 1000).toJSON(),
        };
    });
}

function getTracksFromChartlist(rows) {
    return rows.map((row) => {
        const $name = row.querySelector('.chartlist-name a');
        const $artist = row.querySelector('.chartlist-artist a');
        const $timestamp = row.querySelector('.chartlist-timestamp span');

        return {
            name: $name.textContent,
            url: $name.href,
            artist: {
                name: $artist.textContent,
                url: $artist.href,
            },
            timestamp: $timestamp.title,
        };
    });
}

module.exports = {
    getListeningHistoryScrobbles,
    getTracksFromChartlist
};
