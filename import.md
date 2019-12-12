# Import

## How to empty tables?

```
# Delete all rows from table
DELETE FROM tablename
```

## How to create tables?

```
# Artists
create table artists (
	id serial primary key,
	name VARCHAR(256) not null
);

# Tracks
create table tracks (
	id serial primary key,
	name varchar(256) not null,
	duration_ms int
);

# Artists Tracks junction table
create table artists_tracks (
	artist_id int references artists (id),
	track_id int references tracks (id),
	primary key (artist_id, track_id)
);

# Scrobbles
create table scrobbles (
	id serial primary key,
	track_id int references tracks (id),
	played_at timestamp without time zone
);
```

## How to export database?

Try https://www.postgresqltutorial.com/postgresql-backup-database/

## How to import database? / How to seed database?