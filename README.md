# Scropple Puppet

A [last.fm](https://last.fm) scraper using [Puppeteer](https://pptr.dev/).

I wanted to free my data from last.fm so I wrote this set of scripts. It could be much more efficient in regards to the scraping strategy and perhaps to how the data is stored but it suits my needs for now.

1. Create a `config.json` with a username property:

```
{
    "username": "BBC6Music"
}
```

2. Get library

This will output a JSON file of scrobbles per year for the history of the user.

```
node ./src/get-library.js
```

3. Get one or more years from the library

```
# All years
node ./src/get-years.js

# Specific year
node ./src/get-years.js --year=<target-year>
```

4. Get months

```
# Get all months in library
node ./src/get-months.js

# Get all months of a year
node ./src/get-months.js --year=<target-year>

# Get one month from a year
node ./src/get-months.js --year=<target-year> --month=<target-month>
```

5. Get all dates by year or by month:

```
# Get dates by year
node ./src/get-dates.js --year=<target-year>

# Get dates by month
node ./src/get-dates.js --year=<target-year> --month=<target-month>
```

## Todo - add example structure of data folder

## History
Go back through the git history to view early examples of how I approached the scraping and how messy it was at times. Some files though were documented explaining what happens at each step. This was done so I could demonstrate what was happening to a JavaScript novice to understand, also, helpful for me too.

See `./src/listening-history.js`.

## Todo

- Add better error handling e.g. timeout, loss of connection
- Save errors to disk for retry
- Speed up the scraping by using multiple tabs, do not need to close tab
- Add tests

### Example errors

```
TimeoutError: Navigation Timeout Exceeded: 30000ms exceeded
    -- stack here
  name: 'TimeoutError'
}
```
