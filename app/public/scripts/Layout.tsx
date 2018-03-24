import * as React from 'react'
import * as ReactDOM from 'react-dom'

let sectionStyle = {
  maxWidth: '1240px',
  margin: '0 auto'
}

export class Section extends React.Component {
  render() {
    return <section style={sectionStyle}>{this.props.children}</section>
  }
}
