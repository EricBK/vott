import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { HomePage } from './Home';
import { VideoPage } from './Video';
import { videosStore } from './Store';

export class App extends React.Component {
  checkIntervalId: number = null

  componentDidMount() {
    videosStore.init()

    this.checkIntervalId = window.setInterval(() => {
      videosStore.init()
    }, 10 * 1000)
  }

  componentWillUnmount() {
    clearInterval(this.checkIntervalId)
  }

  render() {
    return (
      <Router>
        <div>
          <Route exact path="/" component={HomePage}/>
          <Route path="/videos/:id" component={VideoPage}/>
        </div>
      </Router>
    )
  }
}