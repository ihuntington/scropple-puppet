# Scropple puppet

1. Create a `config.json` with a username property:

```
{
    "username": "BBC6Music"
}
```

2. To get library:

```
node ./src/years.js
```

3. To get months for year(s):

```
node ./src/get-months-in-year.js --year=<target-year>
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
