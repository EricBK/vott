'use strict'

const fs = require('fs')
const readDir = require('../tools/fs').readDir
const Controller = require('egg').Controller

class HomeController extends Controller {
  async index() {
    await this.ctx.render('index.tpl')
  }
}

module.exports = HomeController
