
'use strict';

const db = require('./tools/db')
const VideoState = require('./models/video').VideoState;


/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/api/v1/labels', controller.videos.findAllLabels);
  router.get('/api/v1/videos', controller.videos.findAll);
  router.get('/api/v1/videos/:id', controller.videos.findOne);
  router.get('/api/v1/videos/:id/frames/:index/extras', controller.videos.findExtraFrames);
  router.post('/api/v1/videos/:id', controller.videos.update);
  router.post('/api/v1/videos/:id/results', controller.videos.saveLabel);
  router.get('*', controller.home.index);

  app.beforeStart(async () => {
    let currState = VideoState.PreProcessing
    let targetState = VideoState.PreProcessFail

    return db.run(`UPDATE videos SET state = $targetState WHERE state = $currState`, {
      $currState: currState,
      $targetState: targetState
    })
  })
};
