const Service = require('egg').Service
const readDir = require('../tools/fs').readDir
const rmdir = require('rimraf')
const fs = require('fs')
const path = require('path')
const Video = require('../models/video')
const VideoState = Video.VideoState
const ffmpeg = require('../tools/ffmpeg')
const db = require('../tools/db')

class VideoService extends Service {
  determineSPF(video) {
    let spf = 1
    let spfConfig = this.app.config.customize.spf
    try {
      for (let range in spfConfig) {
        let min = range.split('~')[0]
        let max = range.split('~')[1]

        if (min && max) {
          if (
            video.duration >= parseFloat(min, 10) * 60 &&
            video.duration <= parseFloat(max, 10) * 60
          ) {
            spf = spfConfig[range]
            break
          }
        } else if (min) {
          if (video.duration >= parseFloat(min, 10) * 60) {
            spf = spfConfig[range]
            break
          }
        }
      }
    } catch (e) {
      spf = 1
    }

    return spf
  }

  async findAllLabels() {
    return new Promise(function(resolve, reject) {
      fs.readFile('./config.json', { encoding: 'utf8' }, function(
        err,
        content
      ) {
        if (err) {
          reject(err)
        } else {
          try {
            let config = JSON.parse(content)
            resolve(config.labels)
          } catch (e) {
            reject(e)
          }
        }
      })
    })
  }

  async findOne(conditions, options = {}) {
    let { id } = conditions

    let stmt = `SELECT rowid, duration, framerate, width, height, file, state FROM videos WHERE rowid = $rowid`
    let bind = {
      $rowid: id
    }

    let rows = await db.all(stmt, bind)
    if (rows.length === 0) {
      return new Error('视频文件不存在')
    } else {
      let { videosDir, outputDir } = this.app.config.customize
      let row = rows[0]

      if (!fs.existsSync(path.join(videosDir, row.file))) {
        return {
          id: row.rowid,
          duration: row.duration,
          framerate: row.framerate,
          width: row.width,
          height: row.height,
          file: row.file,
          state: VideoState.Removed
        }
      }

      let video = {
        id: row.rowid,
        duration: row.duration,
        framerate: row.framerate,
        width: row.width,
        height: row.height,
        file: row.file,
        state: row.state
      }

      if (options.details) {
        let spf = this.determineSPF(video)
        let fps = 1 / spf

        let videoOutputDir = path.join(outputDir, video.file)

        let frameImages = []
        if (video.state === VideoState.PreProcessDone || video.state === VideoState.Processed) {
          try {
            frameImages = await readDir(videoOutputDir)
          } catch (e) {
            video.state = VideoState.New
            frameImages = []
          }
        }

        video.frames = frameImages
          .filter(image => {
            let imagePath = path.parse(image)
            return imagePath.ext === '.jpg'
          })
          .map(image => {
            let imagePath = path.parse(image)
            let index = parseInt(imagePath.name)
            let timestamp = 1 / fps * index - 1 / fps / 2

            return {
              index,
              image,
              timestamp
            }
          })
          .sort((a, b) => a.timestamp - b.timestamp)
      }

      return video
    }
  }

  async findAll() {
    let files = await readDir(this.app.config.customize.videosDir)
    files = files.filter(file => {
      let filePath = path.parse(file)
      return filePath.ext === '.mp4' || filePath.ext === '.webm' || filePath.ext === '.ogg'
    })

    let videos = []
    for (let file of files) {
      let stmt = `SELECT rowid, file, framerate, duration, width, height, state FROM videos WHERE file = $file`
      let bind = {
        $file: file
      }
      let row = await db.get(stmt, bind)
      if (row) {
        videos.push({
          id: row.rowid,
          file: row.file,
          framerate: row.framerate,
          duration: row.duration,
          width: row.width,
          height: row.height,
          state: row.state
        })
      } else {
        let videoFile = path.join(this.app.config.customize.videosDir, file)
        let metadata = await ffmpeg.readMetadata(videoFile)

        let framerate = 0
        let width = 0
        let height = 0
        for (let stream of metadata.streams) {
          if (stream.codec_type === 'video') {
            framerate = parseInt(stream.r_frame_rate.split('/'), 10)
            width = stream.width
            height = stream.height
          }
        }

        let stmt = `INSERT INTO videos(file, duration, framerate, width, height, state) VALUES($file, $duration, $framerate, $width, $height, $state)`
        let bind = {
          $file: file,
          $duration: metadata.format.duration,
          $width: width,
          $height: height,
          $framerate: framerate,
          $state: VideoState.New
        }

        let row = await db.run(stmt, bind)
        videos.push({
          id: row.lastID,
          file: file,
          duration: metadata.format.duration,
          framerate: framerate,
          width: width,
          height: height,
          state: VideoState.New
        })
      }
    }

    return videos.sort((v1, v2) => v1.id - v2.id)
  }

  async preProcess(conditions) {
    let { id, file } = conditions

    let video = await this.findOne({ id })
    if (video.file !== file) {
      throw new Error('数据不匹配')
    }

    let rs = await this.update({ id }, { state: VideoState.PreProcessing })

    let { videosDir, outputDir } = this.app.config.customize
    let videoFile = path.join(videosDir, file)
    let videoOutputDir = path.join(outputDir, file)

    let work = () => {
      fs.mkdirSync(videoOutputDir)

      let spf = this.determineSPF(video)
      let fps = 1 / spf

      ffmpeg.extractSamples(videoFile, videoOutputDir, fps).then(
        () => {
          this.update({ id }, { state: VideoState.PreProcessDone })
        },
        () => {
          this.update({ id }, { state: VideoState.PreProcessFail })
        }
      )
    }

    if (fs.existsSync(outputDir) === false) {
      fs.mkdirSync(outputDir)
    }

    if (fs.existsSync(videoOutputDir) === true) {
      rmdir(videoOutputDir, work)
    } else {
      process.nextTick(work)
    }

    return {}
  }

  async update(conditions, params) {
    let { id } = conditions
    let { state } = params

    let stmt = `UPDATE videos SET state = $state WHERE rowid = $id`
    let bind = {
      $id: id,
      $state: state
    }

    let row = await db.run(stmt, bind)

    return row
  }

  async findExtraFrames(conditions) {
    let { id, index } = conditions

    let video = await this.findOne({ id })

    let { videosDir, outputDir } = this.app.config.customize
    let framesDir = path.join(outputDir, video.file, index)
    let videoFile = path.join(videosDir, video.file)
    let spf = this.determineSPF(video)
    let startTimestamp = spf * (index - 1)

    let exists = fs.existsSync(framesDir)
    if (!exists) {
      if (fs.existsSync(framesDir) === false) {
        fs.mkdirSync(framesDir)
      }

      await ffmpeg.extractFrames(videoFile, framesDir, startTimestamp, spf)
    }

    let images = await readDir(framesDir)

    let frameInterval = spf / images.length

    return images.map(image => {
      let imagePath = path.parse(image)
      let imageIndex = parseInt(imagePath.name)

      return {
        imageIndex,
        image
      }
    }).sort((a, b) => {
      return a.imageIndex - b.imageIndex
    }).map(item => {

      return {
        index,
        timestamp: item.imageIndex * frameInterval + startTimestamp,
        image: index + '/' + item.image
      }
    })
  }

  async writeLabelFile(file, content) {
    let { videosDir, outputDir } = this.app.config.customize
    content.url = path.join(videosDir, file)

    return new Promise((resolve, reject) => {
      let jsonDir = path.join(outputDir, 'jsonlist')
      if(!fs.existsSync(jsonDir)) {
        fs.mkdir(jsonDir)
      }

      let fileName = `${file}.json`
      let filePath = path.join(jsonDir, fileName)
      fs.writeFile(filePath, JSON.stringify(content, null, 0), (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async saveLabel(data) {
    let {id, file, content} = data

    let rs = await this.writeLabelFile(file, content)
    return await this.update({ id }, { state: VideoState.Processed })
  }
}

module.exports = VideoService
