const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('./migrations/vott.db')

exports.db = db
