# Scropple puppet

1. Create a `config.json` with a username property:

```
{
    "username": "BBC6Music"
}
```

2. To get all years:

```
node ./src/years.js
```

3. To get all months:

```
node ./src/get-months-in-year.js --year=<target-year>
```

4. To get all days:

```
node ./src/get-days-in-month.js --year=<target-year>
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
