import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ClassNames from 'classnames'
import { observer } from 'mobx-react'
import { Checkbox, Row, Col, Icon, Modal, Button, Table, Select } from 'antd'
import {
  videoStore,
  VideoState,
  videosStore,
  Label,
  Clip,
  Frame,
  translate
} from './Store'
import { Section } from './Layout'
import * as MouseTrap from 'mousetrap'

function formatTimestamp(duration: number) {
  let secondsPerHour = 60 * 60
  let secondsPerMiniute = 60

  let hours = Math.floor(duration / secondsPerHour)
  let left = duration - hours * secondsPerHour

  let minutes = Math.floor(left / secondsPerMiniute)
  let seconds = left - minutes * secondsPerMiniute

  let result = ''
  if (hours < 10) {
    result += '0'
  }
  result += hours
  result += ':'

  if (minutes < 10) {
    result += '0'
  }
  result += minutes
  result += ':'

  if (seconds < 10) {
    result += '0'
  }
  result += seconds.toFixed(3)

  return result
}

export interface FrameProps {
  className: string
  frame: Frame
  onHover: (frame: Frame) => void
  onChoose: (frame: Frame) => void
  onExpand?: (frame: Frame) => void
}

@observer
export class FrameComp extends React.Component<FrameProps> {
  timer: number = 0
  isDoubleClick: boolean = false
  delay: number = 250

  onMouseEnter() {
    this.props.onHover(this.props.frame)
  }

  onClick() {
    this.timer = window.setTimeout(() => {
      if (!this.isDoubleClick) {
        if (this.props.onChoose) {
          this.props.onChoose(this.props.frame)
        }
      }

      this.isDoubleClick = false
    }, this.delay)
  }

  onDoubleClick() {
    window.clearTimeout(this.timer)
    this.isDoubleClick = true
    if (this.props.onExpand) {
      this.props.onExpand(this.props.frame)
    }
  }

  render() {
    return (
      <img
        className={this.props.className}
        onMouseEnter={(evt: React.MouseEvent<HTMLImageElement>) =>
          this.onMouseEnter()
        }
        onClick={(evt: React.MouseEvent<HTMLImageElement>) => this.onClick()}
        onDoubleClick={(evt: React.MouseEvent<HTMLImageElement>) =>
          this.onDoubleClick()
        }
        style={{ display: 'block', width: '100%' }}
        src={`/static/${videoStore.video.file}/${this.props.frame.image}`}
      />
    )
  }
}

interface VideoPageProps {
  match: {
    params: {
      id: number
    }
  }
  history: any
}

interface VideoPageState {}

let clipLabelKey = {
  q: 1,
  w: 2,
  e: 3,
  r: 4,
  t: 5,
  y: 6,
  u: 7,
  i: 8,
  o: 9
}

@observer
export class VideoPage extends React.Component<VideoPageProps, VideoPageState> {
  checkIntervalId: number = null
  videoRef: HTMLVideoElement = null

  componentDidMount() {
    videoStore.init(this.props.match.params.id)

    this.checkIntervalId = window.setInterval(() => {
      videoStore.sync(this.props.match.params.id)
    }, 10 * 1000)

    for (let i of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      MouseTrap.bind(i, this.chooseVideoLabel)
    }
    for (let c of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o']) {
      MouseTrap.bind(c, this.chooseClipLabel)
    }
    MouseTrap.bind('a', this.editStartFrame)
    MouseTrap.bind('f', this.editEndFrame)
    MouseTrap.bind('s', this.saveLabel)
    MouseTrap.bind('right', this.gotoNext)
  }

  componentWillReceiveProps(newProps) {
    videoStore.reset()

    videoStore.init(this.props.match.params.id)
  }

  componentWillUnmount() {
    videoStore.reset()

    clearInterval(this.checkIntervalId)

    for (let i of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      MouseTrap.unbind(i, this.chooseVideoLabel)
    }
    for (let c of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o']) {
      MouseTrap.unbind(c, this.chooseClipLabel)
    }
    MouseTrap.unbind('a', this.editStartFrame)
    MouseTrap.unbind('f', this.editEndFrame)
    MouseTrap.unbind('s', this.saveLabel)
    MouseTrap.unbind('right', this.gotoNext)
  }

  chooseVideoLabel(evt: KeyboardEvent) {
    console.log(evt)
    let videoLabelIndex = parseInt(evt.key, 10) - 1
    let label = videosStore.labels.video[videoLabelIndex]
    if (label) {
      videoStore.toggleVideoLabel(label)
    }
  }

  chooseClipLabel(evt: KeyboardEvent) {
    let clipLabelIndex = clipLabelKey[evt.key] - 1
    let clipLabel = videosStore.labels.clip[clipLabelIndex]
    if (clipLabel) {
      videoStore.chooseClipLabel(clipLabel)
    }
  }

  editStartFrame(evt: KeyboardEvent) {
    if (videoStore.choosedClip) {
      let startFrame = videoStore.video.frames.find(
        _frame => _frame.index === videoStore.choosedClip.startFrame.index
      )
      videoStore.loadExtraFrames(
        videoStore.choosedClip,
        startFrame,
        'startFrame'
      )
      videoStore.showExtraFramesModal()
    }
  }

  editEndFrame(evt: KeyboardEvent) {
    if (videoStore.choosedClip) {
      let endFrame = videoStore.video.frames.find(
        _frame => _frame.index === videoStore.choosedClip.endFrame.index
      )
      videoStore.loadExtraFrames(
        videoStore.choosedClip,
        endFrame,
        'endFrame'
      )
      videoStore.showExtraFramesModal()
    }
  }

  saveLabel(evt: KeyboardEvent) {
    if (videoStore.saving) {
      return
    }

    videoStore.save().then(() => {
      window.location.href = `/videos/${videoStore.video.id + 1}`
    })
  }

  gotoNext(evt: KeyboardEvent) {
    window.location.href = `/videos/${videoStore.video.id + 1}`
  }

  render() {
    if (!videoStore.video) {
      if (videoStore.exist) {
        return (
          <Modal title="正在加载" closable={false} visible={true}>
            <Icon type="loading" />
          </Modal>
        )
      } else {
        return (
          <Modal
            title="视频文件不存在"
            closable={false}
            visible={true}
            onOk={() => {
              window.location.href = '/'
            }}
            onCancel={() => {
              window.location.href = '/'
            }}
          >
            未找到该视频文件<Icon type="exclamation" />
          </Modal>
        )
      }
    }

    if (
      videoStore.video.state === VideoState.New ||
      videoStore.video.state === VideoState.PreProcessFail
    ) {
      return (
        <Modal
          visible={true}
          title={videoStore.video.file}
          onOk={() => videoStore.startPreProcess()}
        >
          <p>该文件没进行预处理，是否开始?</p>
        </Modal>
      )
    }

    if (videoStore.video.state === VideoState.PreProcessing) {
      return (
        <Modal
          visible={true}
          title="正在预处理"
          onOk={() => videoStore.startPreProcess()}
          footer={null}
        >
          该文件正在进行预处理<Icon type="loading" />
        </Modal>
      )
    }

    if (
      videoStore.video.state === VideoState.Removed
    ) {
      return (
        <Modal
          visible={true}
          title={videoStore.video.file}
          onOk={() => {
            window.location.href = `/videos/${videoStore.video.id + 1}`
          }}
        >
          <p>该文件已被删除，是否标注下一个？</p>
        </Modal>
      )
    }

    return (
      <Section>
        <Row gutter={10}>
          <Col
            span={12}
            style={{ padding: '10px', height: '100vh', overflowY: 'auto' }}
          >
            <p>视频截帧<span style={{display: 'inline-block', padding: '0 5px', margin: '0 10px', background: 'green', color: 'white'}}>{translate(videoStore.video.state)}</span></p>
            <Row gutter={10}>
              {videoStore.video.frames.map(frame => {
                let isSelected =
                  (videoStore.startFrame &&
                    frame.timestamp == videoStore.startFrame.timestamp) ||
                  (videoStore.endFrame &&
                    frame.timestamp == videoStore.endFrame.timestamp)
                let isIncluded =
                  videoStore.startFrame &&
                  frame.timestamp > videoStore.startFrame.timestamp &&
                  (videoStore.endFrame &&
                    frame.timestamp < videoStore.endFrame.timestamp)
                let isDisabled =
                  (videoStore.startFrame &&
                    frame.timestamp < videoStore.startFrame.timestamp) ||
                  (videoStore.endFrame &&
                    frame.timestamp > videoStore.endFrame.timestamp)

                let className = ClassNames('frame', {
                  'frame--selected': isSelected,
                  'frame--included': isIncluded,
                  'frame--disabled': isDisabled
                })
                return (
                  <Col style={{ marginBottom: '10px' }} span={8}>
                    <FrameComp
                      className={className}
                      frame={frame}
                      onHover={(frame: Frame) =>
                        this.videoRef.currentTime = frame.timestamp
                      }
                      onChoose={(frame: Frame) =>
                        videoStore.chooseClipFrame(frame)
                      }
                    />
                  </Col>
                )
              })}
            </Row>
          </Col>
          <Col
            span={12}
            style={{ padding: '10px', height: '100vh', overflowY: 'auto' }}
          >
            <video
              ref={(elem: HTMLVideoElement) => {
                this.videoRef = elem
              }}
              style={{ display: 'block', width: '100%', maxHeight: '50%' }}
              controls
            >
              <source src={'/static/' + videoStore.video.file} />
            </video>
            <section>
              <Row style={{ margin: '10px 0' }}>
                <Col span={20}>
                  <h3>视频{videoStore.video && videoStore.video.file}</h3>
                </Col>
                <Col span={4}>
                  <Button
                    htmlType="button"
                    type="primary"
                    disabled={videoStore.saving}
                    onClick={(evt: React.ChangeEvent<HTMLButtonElement>) => {
                      videoStore.save().then(() => {
                        window.location.href = `/videos/${videoStore.video.id +
                          1}`
                      })
                    }}
                  >
                    保存标签
                  </Button>
                </Col>
              </Row>
            </section>
            <section>
              <Row style={{ margin: '10px 0' }}>
                <Col span={20}>
                  <h4>视频标签</h4>
                </Col>
              </Row>
              <Row>
                {videosStore.labels.video.map((label: Label) => {
                  return (
                    <Col span={6}>
                      <Checkbox
                        onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
                          videoStore.toggleVideoLabel(label)
                        }
                        checked={videoStore.hasVideoLabel(label)}
                      >
                        {label.name}
                      </Checkbox>
                    </Col>
                  )
                })}
              </Row>
            </section>
            <section>
              <Row style={{ margin: '10px 0' }}>
                <Col span={20}>
                  <h4>视频片段标签</h4>
                </Col>
              </Row>
              <Row>
                {videosStore.labels.clip.map((label: Label) => {
                  return (
                    <Col span={6}>
                      <Checkbox
                        onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
                          videoStore.chooseClipLabel(label)
                        }
                        checked={
                          videoStore.choosedClipLabel &&
                          videoStore.choosedClipLabel.name === label.name
                        }
                      >
                        {label.name}
                      </Checkbox>
                    </Col>
                  )
                })}
              </Row>
            </section>
            <Table
              showHeader={false}
              title={() => '视频片段'}
              scroll={{ y: 240 }}
              pagination={false}
              rowClassName={(record: Clip, index: number) => {
                let choosedClip = videoStore.choosedClip
                return ClassNames('clip', {
                  'clip--choosed': choosedClip && record.key === choosedClip.key
                })
              }}
              onRow={(record: Clip) => {
                return {
                  onClick: () => {
                    videoStore.chooseClip(record)
                    this.forceUpdate()
                  }
                }
              }}
              dataSource={videoStore.sortedClip}
            >
              <Table.Column
                render={(text: string, record: Clip) => {
                  return (
                    <Select
                      defaultValue={record.label.name}
                      value={record.label.name}
                      onChange={(value: string) => {
                        let label = videosStore.labels.clip.find(
                          _clipLabel => _clipLabel.name === value
                        )

                        videoStore.updateClip(record, 'label', label)

                        this.forceUpdate()
                      }}
                    >
                      {videosStore.labels.clip.map((label: Label) => {
                        return (
                          <Select.Option value={label.name}>
                            {label.name}{' '}
                          </Select.Option>
                        )
                      })}
                    </Select>
                  )
                }}
              />
              <Table.Column
                render={(text: string, record: Clip) => {
                  return [
                    <img
                      onClick={(evt: React.MouseEvent<HTMLImageElement>) => {
                        videoStore.loadExtraFrames(
                          record,
                          record.startFrame,
                          'startFrame'
                        )
                        videoStore.showExtraFramesModal()
                      }}
                      className="frame frame--small"
                      src={`/static/${videoStore.video.file}/${
                        record.startFrame.image
                      }`}
                    />,
                    <p style={{ margin: 0 }}>
                      {formatTimestamp(record.startFrame.timestamp)}
                    </p>
                  ]
                }}
              />
              <Table.Column
                render={(text: string, record: Clip) => {
                  if (!record.endFrame) {
                    return [<p>未选择</p>]
                  }

                  return [
                    <img
                      onClick={(evt: React.MouseEvent<HTMLImageElement>) => {
                        videoStore.loadExtraFrames(
                          record,
                          record.endFrame,
                          'endFrame'
                        )
                        videoStore.showExtraFramesModal()
                      }}
                      className="frame frame--small"
                      src={`/static/${videoStore.video.file}/${
                        record.endFrame.image
                      }`}
                    />,
                    <p style={{ margin: 0 }}>
                      {formatTimestamp(record.endFrame.timestamp)}
                    </p>
                  ]
                }}
              />
              <Table.Column
                render={(text: string, record: Clip) => {
                  return (
                    <Button
                      htmlType="button"
                      onClick={(evt: React.MouseEvent<HTMLButtonElement>) =>
                        videoStore.removeClip(record)
                      }
                    >
                      删除
                    </Button>
                  )
                }}
              />
            </Table>
          </Col>
        </Row>
        <Modal
          width={960}
          visible={videoStore.extraFramesModalVisiable}
          afterClose={() => videoStore.hideExtraFramesModal()}
          onOk={() => videoStore.hideExtraFramesModal()}
          onCancel={() => videoStore.hideExtraFramesModal()}
        >
          <Row gutter={5}>
            {videoStore.extraFrameIndex.length > 0 &&
            videoStore.extraFrameIndex[0] !== 0 ? (
              <Col style={{ padding: '5px' }} span={6}>
                <Button
                  disabled={videoStore.loadingFront}
                  onClick={(evt: React.MouseEvent<HTMLButtonElement>) => {
                    videoStore.loadFrontFrames()
                  }}
                >
                  {videoStore.loadingFront ? '加载中' : '加载更多'}
                </Button>
              </Col>
            ) : null}
            {videoStore.extraFrameIndex.map(index => {
              let extraFrames = videoStore.extraFrames.get(index)
              if (!extraFrames) {
                return null
              }

              return extraFrames.map(frame => {
                return (
                  <Col style={{ padding: '5px' }} span={6}>
                    <img
                      style={{ width: '100%' }}
                      src={`/static/${videoStore.video.file}/${frame.image}`}
                      onClick={(evt: React.MouseEvent<HTMLImageElement>) => {
                        videoStore.updateClip(
                          videoStore.choosedClip,
                          videoStore.currClipFrameType,
                          frame
                        )
                        videoStore.hideExtraFramesModal()
                      }}
                    />
                  </Col>
                )
              })
            })}
            {videoStore.extraFrameIndex.length > 0 &&
            videoStore.extraFrameIndex[
              videoStore.extraFrameIndex.length - 1
            ] !==
              videoStore.video.frames.length - 1 ? (
              <Col style={{ padding: '5px' }} span={6}>
                <Button
                  disabled={videoStore.loadingBack}
                  onClick={(evt: React.MouseEvent<HTMLButtonElement>) => {
                    videoStore.loadBackFrames()
                  }}
                >
                  {videoStore.loadingBack ? '加载中' : '加载更多'}
                </Button>
              </Col>
            ) : null}
          </Row>
        </Modal>

        <Modal visible={videoStore.saving} closable={false} footer={null}>
          <p>
            <Icon type="loading" />正在保存...
          </p>
        </Modal>
      </Section>
    )
  }
}
