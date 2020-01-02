create table artists (
	id serial primary key,
	name VARCHAR(256) not null
);

create table tracks (
	id serial primary key,
	name varchar(256) not null,
	duration_ms int,
	spotify_id varchar(64)
);

create table artists_tracks (
	artist_id int references artists (id),
	track_id int references tracks (id),
	primary key (artist_id, track_id)
);

create table scrobbles (
	id serial primary key,
	track_id int references tracks (id),
	played_at timestamp without time zone
);

create table track_audio_features(
	id serial primary key,
	track_id int references tracks(id),
	acousticness real,
	energy real,
	danceability real,
	instrumentalness real,
	liveness real,
	loudness real,
	speechiness real,
	valence real,
	time_signature int,
	tempo real
);
