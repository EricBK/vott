const path = require('path')
const fs = require('fs')
const db = require('../app/tools/db')
const Video = require('../app/models/video')
const VideoState = Video.VideoState

let configFile = path.join('./config.json')
let content = fs.readFileSync(configFile)
let config = JSON.parse(content)

let jsonDir = path.join(config.outputDir, 'jsonlist')
let jsonFiles = fs.readdirSync(jsonDir)

let cache = {}
for (let jsonFile of jsonFiles) {
  let parts = jsonFile.split('-')
  let videoFile = parts.slice(0, parts.length - 3).join('-')

  if (videoFile.length > 0) {
    if (cache[videoFile]) {
      cache[videoFile].push(jsonFile)
    } else {
      cache[videoFile] = [jsonFile]
    }
  }
}

let promises = Object.keys(cache).map(videoFile => {
  let jsonFiles = cache[videoFile].sort().reverse()

  let newestJsonFile = jsonFiles[0]
  let oldJsonFiles = jsonFiles.slice(1)
  for (let oldJsonFile of oldJsonFiles) {
    let filePath = path.join(jsonDir, oldJsonFile)
    fs.unlinkSync(filePath)
  }

  fs.renameSync(
    path.join(jsonDir, newestJsonFile),
    path.join(jsonDir, videoFile + '.json')
  )

  let stmt = `UPDATE videos SET state = $state WHERE file = $file`
  let bind = {
    $file: videoFile,
    $state: VideoState.Processed
  }

  return db.run(stmt, bind)
})

Promise.all(promises).then(
  (res) => {
    console.log(res)
  },
  err => {
    console.log(err)
  }
)
