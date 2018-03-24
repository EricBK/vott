import { observable, action, computed } from 'mobx'

export enum VideoState {
  New = 0,
  PreProcessing = 1,
  PreProcessDone = 2,
  PreProcessFail = 3,
  Processed = 4,
  Removed = 5
}

export function translate(state: VideoState) {
  let statusTxt = ''
  switch(state) {
    case VideoState.New:
      statusTxt = '尚未预处理'
    break
    case VideoState.PreProcessing:
      statusTxt = '预处理中'
    break
    case VideoState.PreProcessDone:
      statusTxt = '已预处理'
    break
    case VideoState.PreProcessFail:
      statusTxt = '预处理失败'
    break
    case VideoState.Processed:
      statusTxt = '已标注'
    break
  }

  return statusTxt
}

export interface Frame {
  index: number
  timestamp: number
  image: string
}

export interface Video {
  id: number
  file: string
  duration: number
  frames?: Frame[]
  width: number
  height: number
  state: VideoState
}

export interface Label {
  name: string
}

export interface Labels {
  video: Label[]
  clip: Label[]
}

type ClipFrameType = 'startFrame' | 'endFrame'

export interface Clip {
  key: number
  label: Label
  startFrame: Frame
  endFrame: Frame
}

export class VideosStore {
  @observable loading: boolean = false
  @observable labels: Labels = { video: [], clip: [] }
  @observable videos: Video[] = []
  @observable keyword: string = ''
  @observable autoPreProcessing: boolean = false
  @observable autoPreProcessingLoop: number = null

  init() {
    if (this.loading) {
      return
    }

    this.loading = true
    fetch('/api/v1/videos')
      .then(res => res.json())
      .then(
        action((videos: Video[]) => {
          this.loading = false
          this.videos = videos

          if (localStorage.getItem('autoPreProcessing')) {
            this.autoPreProcessing =
              localStorage.getItem('autoPreProcessing') === 'true'
          }

          if (this.autoPreProcessing) {
            this.startAutoPreProcess()
          }
        })
      )

    fetch('/api/v1/labels')
      .then(res => res.json())
      .then(
        action((labels: Labels) => {
          this.labels = labels
        })
      )
  }

  @computed
  get visiableVideos() {
    return this.videos.filter(video => video.file.indexOf(this.keyword) !== -1)
  }

  autoPreProcess() {
    let preProcessingVideos = this.videos.filter(
      video => video.state === VideoState.PreProcessing
    )
    if (preProcessingVideos.length >= 10) {
      return
    }

    let videos = this.videos
      .filter(
        video =>
          video.state === VideoState.New ||
          video.state === VideoState.PreProcessFail
      )
      .slice(0, 10 - preProcessingVideos.length)
      .map(video => this.startPreProcess(video))
  }

  startAutoPreProcess() {
    if (this.autoPreProcessingLoop) {
      return
    }

    this.autoPreProcess()

    this.autoPreProcessingLoop = window.setInterval(() => {
      this.autoPreProcess()
    }, 5000)
  }

  stopAutoPreProcess() {
    if (!this.autoPreProcessingLoop) {
      return
    }

    clearInterval(this.autoPreProcessingLoop)
    this.autoPreProcessingLoop = null
  }

  toggleAutoPreProcess() {
    this.autoPreProcessing = !this.autoPreProcessing
    localStorage.setItem('autoPreProcessing', this.autoPreProcessing.toString())

    if (this.autoPreProcessing) {
      this.startAutoPreProcess()
    } else {
      this.stopAutoPreProcess()
    }
  }

  @action
  startPreProcess(video: Video) {
    let index = this.videos.findIndex(_video => _video.id === video.id)
    this.videos[index] = {
      ...video,
      state: VideoState.PreProcessing
    }

    fetch(`/api/v1/videos/${video.id}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'preprocess', file: video.file })
    }).then(res => {
      if (res.status === 200) {
        return res.json()
      } else {
        return Promise.reject(new Error(''))
      }
    })
  }
}

export class VideoStore {
  @observable exist: boolean = true
  @observable loading: boolean = false
  @observable video: Video = null
  @observable choosedLabels: Label[] = []
  @observable choosedClipLabel: Label = null
  @observable clips: Clip[] = []
  @observable startFrame: Frame = null
  @observable endFrame: Frame = null
  @observable choosedClip: Clip = null
  @observable extraFramesModalVisiable: boolean = false
  @observable extraFrames: Map<number, Frame[]> = new Map()
  @observable extraFrameIndex: number[] = []
  @observable loadingFront: boolean = false
  @observable loadingBack: boolean = false
  @observable currClipFrameType: ClipFrameType = null
  @observable saving: boolean = false

  init(id) {
    if (this.loading) {
      return
    }

    this.loading = true

    fetch(`/api/v1/videos/${id}`)
      .then(res => res.json())
      .then(
        action((video: Video) => {
          if (!video.id) {
            this.exist = false
            return
          }

          this.video = video
          this.exist = false
          this.loading = false
        }),
        action((video: Video) => {
          this.loading = false
        })
      )
  }

  sync(id) {
    fetch(`/api/v1/videos/${id}`)
      .then(res => res.json())
      .then(
        action((video: Video) => {
          if (!video.id) {
            this.exist = false
            return
          }

          this.video = video
        })
      )
  }

  @action
  reset() {
    this.video = null
    this.choosedLabels = []
    this.choosedClipLabel = null
    this.clips = []
    this.startFrame = null
    this.endFrame = null
    this.choosedClip = null
    this.extraFrames = new Map()
    this.extraFrameIndex = []
    this.loadingFront = false
    this.loadingBack = false
    this.currClipFrameType = null
  }

  @action
  toggleVideoLabel(label: Label) {
    let index = this.choosedLabels.findIndex(
      _label => _label.name === label.name
    )
    if (index === -1) {
      this.choosedLabels.push(label)
    } else {
      this.choosedLabels.splice(index, 1)
    }
  }

  hasVideoLabel(label) {
    return (
      this.choosedLabels.findIndex(_label => _label.name === label.name) !== -1
    )
  }

  @action
  chooseClipLabel(label: Label) {
    this.choosedClipLabel = label
  }

  @action
  chooseClipFrame(frame: Frame) {
    if (!this.startFrame || (this.startFrame && this.endFrame)) {
      this.startFrame = frame
      this.endFrame = null
    } else if (frame.timestamp < this.startFrame.timestamp) {
      this.startFrame = frame
    } else {
      this.endFrame = frame

      if (!this.choosedClipLabel) {
        this.choosedClipLabel = videosStore.labels.clip[0]
      }

      let clip: Clip = observable({
        key: new Date().getTime() + Math.random(),
        label: this.choosedClipLabel,
        startFrame: this.startFrame,
        endFrame: this.endFrame
      })

      this.createClip(clip)

      this.choosedClip = clip

      window.setTimeout(
        action(() => {
          this.startFrame = null
          this.endFrame = null
        }),
        500
      )
    }
  }

  @action
  createClip(clip: Clip) {
    this.clips.push(clip)

    this.choosedClip = clip
  }

  @action
  removeClip(clip: Clip) {
    let index = this.clips.findIndex(_clip => _clip.key === clip.key)
    if (index !== -1) {
      this.clips.splice(index, 1)
    }

    if (this.choosedClip === clip) {
      this.choosedClip = null
    }
  }

  @action
  chooseClip(clip: Clip) {
    this.choosedClip = clip
  }

  @action
  updateClip<P extends keyof Clip>(clip: Clip, prop: P, value: Clip[P]) {
    clip[prop] = value
    if (prop === 'endFrame' || prop === 'startFrame') {
      if (clip.startFrame.timestamp > clip.endFrame.timestamp) {
        let tempFrame = clip.startFrame
        clip.startFrame = clip.endFrame
        clip.endFrame = tempFrame
      }
    }
  }

  @computed
  get sortedClip() {
    return this.clips.reverse()
  }

  @action
  startPreProcess() {
    this.video.state = VideoState.PreProcessing

    fetch(`/api/v1/videos/${this.video.id}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'preprocess', file: this.video.file })
    }).then(res => {
      if (res.status === 200) {
        return res.json()
      } else {
        return Promise.reject(new Error(''))
      }
    })
  }

  @action
  loadMoreFrames(frameIndex) {
    return fetch(`/api/v1/videos/${this.video.id}/frames/${frameIndex}/extras`)
      .then(res => res.json())
      .then(
        action((data: Frame[]) => {
          this.extraFrames.set(frameIndex, data)
        })
      )
  }

  @action
  loadFrontFrames() {
    if (videoStore.loadingFront) {
      return
    }
    let firstFrameIndex = videoStore.extraFrameIndex[0]
    if (firstFrameIndex === 0) {
      return
    }

    let prevFrameIndex = firstFrameIndex - 1

    if (this.extraFrames.get(prevFrameIndex)) {
      return
    }

    videoStore.loadingFront = true

    videoStore.loadMoreFrames(prevFrameIndex).then(() => {
      this.extraFrameIndex = [prevFrameIndex].concat(...this.extraFrameIndex)
      videoStore.loadingFront = false
    })
  }

  @action
  loadBackFrames() {
    if (videoStore.loadingBack) {
      return
    }

    let lastFrameIndex =
      videoStore.extraFrameIndex[videoStore.extraFrameIndex.length - 1]
    if (lastFrameIndex === videoStore.video.frames.length - 1) {
      return
    }

    let nextFrameIndex = lastFrameIndex + 1

    if (this.extraFrames.get(nextFrameIndex)) {
      return
    }

    videoStore.loadingBack = true

    videoStore.loadMoreFrames(nextFrameIndex).then(() => {
      this.extraFrameIndex.push(nextFrameIndex)
      videoStore.loadingBack = false
    })
  }

  @action
  loadExtraFrames(clip: Clip, frame: Frame, frameType: ClipFrameType) {
    this.choosedClip = clip
    this.currClipFrameType = frameType
    this.extraFrameIndex = [frame.index]

    if (this.extraFrames.get(frame.index)) {
      return
    }

    return fetch(`/api/v1/videos/${this.video.id}/frames/${frame.index}/extras`)
      .then(res => res.json())
      .then(
        action((data: Frame[]) => {
          this.extraFrames.set(frame.index, data)
        })
      )
  }

  @action
  showExtraFramesModal() {
    this.extraFramesModalVisiable = true
  }

  @action
  hideExtraFramesModal() {
    this.extraFramesModalVisiable = false
  }

  @action
  toggleExtraFramesModal() {
    this.extraFramesModalVisiable = !this.extraFramesModalVisiable
  }

  @action
  save() {
    if (this.saving) {
      return
    }

    this.saving = true

    let file = this.video.file
    let content = {
      type: 'video',
      metadata: {
        duration: this.video.duration,
        resolution: `${this.video.width}x${this.video.height}`
      },
      category: this.choosedLabels.map(label => {
        return {
          label: label.name
        }
      }),
      clips: {
        name: '',
        type: '',
        version: '',
        data: this.clips.map(clip => {
          return {
            label: clip.label.name,
            segment: [
              clip.startFrame.timestamp.toFixed(3),
              clip.endFrame.timestamp.toFixed(3)
            ]
          }
        })
      }
    }

    return fetch(`/api/v1/videos/${this.video.id}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ file, content })
    }).then(() => {
      console.log('saved')
      this.saving = false
    }, () => {
      this.saving = false
      return Promise.reject(new Error('保存失败'))
    })
  }
}

export const videosStore = new VideosStore()
export const videoStore = new VideoStore()
