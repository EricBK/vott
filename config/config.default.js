'use strict'

const fs = require('fs')
const path = require('path');

module.exports = appInfo => {
  const config = (exports = {})

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1519788002545_6386'

  // add your config here
  config.middleware = []

  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.tpl': 'nunjucks'
    }
  }

  config.notfound = {
    pageUrl: '/'
  }

  // parse user config
  try {
    let content = fs.readFileSync('./config.json')
    let customize = JSON.parse(content)
    config.customize = customize
  } catch (e) {
    config.customize = {
      videosDir: './videos'
    }
  }

  const dirs = [
    path.join(appInfo.baseDir, config.customize.videosDir),
    path.join(appInfo.baseDir, config.customize.outputDir),
    path.join(appInfo.baseDir, '/app/public/')
  ];
  config.static = {
    prefix: '/static',
    dir: dirs
  }

  config.security = {
    csrf: {
      enable: false,
    },
  }

  return config
}
