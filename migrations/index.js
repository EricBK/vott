const db = require('../app/models').db

db.run(
  `
  CREATE TABLE IF NOT EXISTS videos(
    file TEXT UNIQUE,
    duration interger,
    framerate integer,
    width integer,
    height integer,
    state INTEGER
  )
  `
);