const ffmpeg = require('fluent-ffmpeg')
const child_process = require('child_process')

exports.readMetadata = async function(videoFile) {
  return new Promise(function(resolve, reject) {
    ffmpeg.ffprobe(videoFile, function(err, metadata) {
      if (err) {
        reject(err)
      } else {
        resolve(metadata)
      }
    })
  })
}

exports.extractFrames = async function(videoFile, outputDir, startTimestamp, duration) {
  const cmd = `ffmpeg -i ${videoFile} -ss ${startTimestamp} -t ${duration} -f image2 -start_number 0 -y '${outputDir}/%d.jpg'`

  return new Promise(function(resolve, reject) {
    child_process.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

exports.extractSamples = async function(videoFile, outputDir, fps) {
  const cmd = `ffmpeg -i ${videoFile} -f image2 -vf fps=${fps} -y '${outputDir}/%d.jpg'`

  return new Promise(function(resolve, reject) {
    child_process.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
