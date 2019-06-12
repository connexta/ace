const fs = require('fs')

const { runner } = require('./mocha-headless-chrome')

module.exports = ({ args, getPackage }) => {
  const pkg = getPackage()

  const {
    url = './target/test/index.html',
    width = 1280,
    height = 800,
    timeout = 15 * 60,
    visible = false,
  } = args

  runner({
    file: url,
    width,
    height,
    timeout: timeout * 1000,
    reporter: 'spec',
    visible,
    args: ['no-sandbox'],
  })
    .then(({ result, coverage }) => {
      if (result.stats.failures) {
        throw 'Tests failed'
      }
      fs.writeFileSync('target/coverage.json', JSON.stringify(coverage) || '')
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
