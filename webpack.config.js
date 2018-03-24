const path = require('path')

module.exports = {
  entry: './app/public/scripts/index.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'app/public/scripts/')
  },
  resolve: {
    extensions: ['.less', '.tsx', '.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  }
}
