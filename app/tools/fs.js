const fs = require('fs')

exports.readDir = function(dirPath, options) {
  return new Promise(function(resolve, reject) {
    fs.readdir(dirPath, options, function(err, files) {
      if (err) {
        reject(err)
      } else {
        resolve(files)
      }
    })
  })
}
