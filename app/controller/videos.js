'use strict'
const fs = require('fs')
const Controller = require('egg').Controller

class VideosController extends Controller {
  async findAllLabels() {
    let { ctx, service } = this
    let labels = await service.video.findAllLabels()

    ctx.body = labels
  }

  async findAll() {
    let { ctx, service } = this
    let files = await service.video.findAll()

    ctx.body = files
  }

  async findOne() {
    let { ctx, service } = this
    let { id } = ctx.params

    let video = await service.video.findOne({ id }, { details: true })
    if (video instanceof Error) {
      ctx.status = 404
      ctx.body = {}
    } else {
      ctx.body = video
    }
  }

  async update() {
    let { ctx, service } = this
    let { id } = ctx.params
    let { action, file } = ctx.request.body

    let rs
    switch (action) {
      case 'preprocess':
        rs = await service.video.preProcess({ id, file })
        break
    }

    ctx.body = rs
  }

  async findExtraFrames() {
    let { service, ctx } = this
    let { id, index } = ctx.params

    let frames = await service.video.findExtraFrames({
      id,
      index
    })

    ctx.body = frames
  }

  async saveLabel() {
    let { service, ctx } = this
    let { id } = ctx.params
    let { file, content } = ctx.request.body

    let rs = await service.video.saveLabel({
      id,
      file,
      content
    })

    ctx.body = rs
  }
}

module.exports = VideosController
