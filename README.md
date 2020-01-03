# Scropple puppet

A [last.fm](https://last.fm) scraper using Puppeteer.

I wanted to free my data from Last.fm so I wrote this set of scripts. It could probably be much more efficient in regards to the scraping strategy and perhaps to how the data is stored.

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

4. Get all days for year(s) and month(s):

```
# Get all months in library
node ./src/get-days-in-month.js

# Get all months for a specific year
node ./src/get-days-in-month.js --year=<target-year>

# Get all months for a specific year and month
node ./src/get-days-in-month.js --year=<target-year> --month=<target-month>
```

5. To get all tracks for a year from months data:

```
node ./src/get-tracks-for-day.js --year=<target-year>
```

## SQL

```
# View activity in PG
SELECT * FROM pg_stat_activity
WHERE datname = 'database_name';
```

## Issues I ran into

### The Kylie problem

I forgot to consider that different tracks could have the same name and that I should check for the track by artist name and track name when importing the track.

For instance:

Kylie Minogue and BADBADNOTGOOD both wrote a track called In Your Eyes. The import script I originally wrote was not check to see if a track name already existed with the same artist. It just checked for existing track names and returned the ID if matched.

## History
Go back through the git history to view early examples of how I approached the scraping and how messy it was at times. Some files though were documented explaining what happens at each step. This was done so I could demonstrate what was happening to a JavaScript novice to understand, also, helpful for me too.

See `./src/listening-history.js`.
