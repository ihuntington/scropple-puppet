function getScrobblesFromListeningHistoryTable(rows) {
    return new Promise((resolve) => {
        // Array.from is potentially not required here -- check
        const data = Array.from(rows).map((row) => {
            const cells = row.cells;
            const timestamp = parseInt(cells[0].dataset.timestamp, 10);
            const url = cells[0].firstElementChild.href;
            const scrobbles = parseInt(cells[1].textContent, 10);

            return {
                url,
                scrobbles,
                // timestamp in last.fm is in seconds so convert to milliseconds
                date: new Date(timestamp * 1000).toJSON(),
            };
        });

        resolve(data);
    });
}

module.exports = {
    getScrobblesFromListeningHistoryTable,
};
