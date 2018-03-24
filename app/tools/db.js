const db = require('../models').db

exports.get = async function (stmt, bind) {
  return new Promise(function(resolve, reject) {
    db.get(stmt, bind, function (err, row) {
      if(err) {
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

exports.all = async function (stmt, bind) {
  return new Promise(function(resolve, reject) {
    db.all(stmt, bind, function (err, rows) {
      if(err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

exports.run = async function (stmt, bind) {
  return new Promise(function(resolve, reject) {
    db.run(stmt, bind, function (err) {
      if(err) {
        reject(err)
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        })
      }
    })
  })
}