import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Row, Col, Input, Form, Button } from 'antd'
import { Section } from './Layout'
import { ChangeEvent } from 'react'
import { Video, VideoState, videosStore, videoStore, translate } from './Store'
import { action } from 'mobx'
import { observer } from 'mobx-react'

export interface VideoState {}

export interface VideoProps {
  video: Video
  startPreProcess: (video: Video) => void
}

@observer
export class VideoCell extends React.Component<VideoProps, VideoState> {
  render() {
    let { video } = this.props

    let preprocessBtn = null
    let processBtn = null
    switch (video.state) {
      case VideoState.New:
        preprocessBtn = (
          <Button
            type="primary"
            htmlType="button"
            onClick={(evt: any) => this.props.startPreProcess(video)}
          >
            预处理
          </Button>
        )
        break
      case VideoState.PreProcessing:
        break
      case VideoState.PreProcessDone:
        preprocessBtn = (
          <Button
            type="ghost"
            htmlType="button"
            onClick={(evt: any) => this.props.startPreProcess(video)}
          >
            重新预处理
          </Button>
        )
        processBtn = (
          <Button type="primary" href={'/videos/' + video.id}>
            开始标注
          </Button>
        )
        break
      case VideoState.PreProcessFail:
        preprocessBtn = (
          <Button
            type="primary"
            htmlType="button"
            onClick={(evt: any) => this.props.startPreProcess(video)}
          >
            重新预处理
          </Button>
        )
        break
      case VideoState.Processed:
        preprocessBtn = (
          <Button
            type="ghost"
            htmlType="button"
            onClick={(evt: any) => this.props.startPreProcess(video)}
          >
            重新预处理
          </Button>
        )
        processBtn = (
          <Button type="primary" href={'/videos/' + video.id}>
            重新标注
          </Button>
        )
        break
      default:
        preprocessBtn = (
          <Button
            type="primary"
            htmlType="button"
            onClick={(evt: any) => this.props.startPreProcess(video)}
          >
            预处理
          </Button>
        )
        break
    }

    return (
      <Col span={8} key={video.id}>
        <div
          style={{
            border: '1px solid black',
            margin: '5px',
            padding: '5px'
          }}
        >
          <header>
            <h4>文件：{video.file}</h4>
          </header>
          <section>
            <video
              style={{ display: 'block', height: '250px', width: '100%' }}
              controls
            >
              <source src={'/static/' + video.file} />
            </video>
          </section>
          <footer style={{ padding: '20px 0 10px 0' }}>
            <p>时长：{video.duration}秒</p>
            <p>
              状态：<span
                style={{
                  color: video.state === VideoState.Processed ? 'blue' : ''
                }}
              >
                {translate(video.state)}
              </span>
            </p>
            <Button.Group>
              {preprocessBtn}
              {processBtn}
            </Button.Group>
          </footer>
        </div>
      </Col>
    )
  }
}

export interface HomePageProps {}

export interface HomePageState {}

@observer
export class HomePage extends React.Component<HomePageProps, HomePageState> {
  componentDidMount() {
    videosStore.init()
  }

  onSumbit(evt: any) {
    evt.preventDefault()
  }

  @action
  updateKeyword(evt: ChangeEvent<HTMLInputElement>) {
    videosStore.keyword = evt.target.value
  }

  render() {
    let videos = videosStore.visiableVideos
    let rows = []
    let rowCount = Math.ceil(videos.length / 3)
    for (let i = 0; i < rowCount; i++) {
      let row = videos.slice(i * 3, 3 * (i + 1))
      rows.push(row)
    }

    return (
      <Section>
        <Form onSubmit={(evt: any) => this.onSumbit(evt)}>
          <Form.Item>
            <Input
              onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                this.updateKeyword(evt)
              }
              placeholder="搜索视频"
              value={videosStore.keyword}
            />
          </Form.Item>
        </Form>

        <header>
          <h2>
            视频文件&nbsp;&nbsp;
            <Button onClick={evt => videosStore.toggleAutoPreProcess()}>
              {videosStore.autoPreProcessing
                ? '停止自动预处理'
                : '开始自动预处理'}
            </Button>
          </h2>
        </header>
        {rows.map(row => {
          return (
            <Row gutter={10}>
              {row.map(video => {
                return (
                  <VideoCell
                    video={video}
                    startPreProcess={video =>
                      videosStore.startPreProcess(video)
                    }
                  />
                )
              })}
            </Row>
          )
        })}
      </Section>
    )
  }
}
