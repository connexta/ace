import { writeFileSync } from 'fs'

import { runner } from './mocha-headless-chrome.js'

export default ({ args, getPackage }) => {
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
      writeFileSync('target/coverage.json', JSON.stringify(coverage) || '')
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
