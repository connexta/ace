const CLIEngine = require('eslint').CLIEngine
const cheerio = require('cheerio')
const glob = require('glob')
const fs = require('fs')

const htmlLint = () => {
  var htmlResults = { errorCount: 0, errors: [] }
  var files = glob.sync('packages/*/src/**/{*.html,*.handlebars}', {
    matchBase: true,
    realpath: true,
  })
  files.forEach(file => {
    try {
      var reportHtml = function(file, element, attribute, value) {
        if (
          !(value.startsWith('.') || value.startsWith('#')) &&
          !(value.startsWith('javascript') || value.startsWith('{'))
        ) {
          htmlResults.errors.push({
            file: file,
            element: element,
            attribute: attribute,
            value: value,
          })
          htmlResults.errorCount++
        }
      }
      var html = cheerio.load(fs.readFileSync(file, { encoding: 'utf8' }), {
        xmlMode: true,
        decodeEntities: false,
      })
      html('link').each((i, elem) => {
        if (elem.attribs.href) {
          reportHtml(file, 'link', 'href', elem.attribs.href)
        }
      })
      html('a').each((i, elem) => {
        if (elem.attribs.href) {
          reportHtml(file, 'a', 'href', elem.attribs.href)
        }
      })
      html('script').each((i, elem) => {
        if (elem.attribs.src) {
          reportHtml(file, 'script', 'src', elem.attribs.src)
        }
      })
    } catch (e) {
      console.error(e)
    }
  })
  return htmlResults
}

module.exports = ({ args }) => {
  const cli = new CLIEngine({
    useEslintrc: true,
    rules: {
      'no-console': 'off',
      '@connexta/connexta/no-absolute-urls': 2,
    },
    globals: ['define'],
    envs: ['browser', 'node', 'mocha'],
    baseConfig: {
      extends: [
        //'eslint:recommended',
        //'plugin:react/recommended',
      ],
      settings: {
        react: { version: 'detect' },
      },
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      plugins: ['react', '@connexta/connexta'],
      parser: 'babel-eslint',
    },
  })
  console.log('running eslint cli')
  const report = cli.executeOnFiles(['./'])
  const formatter = cli.getFormatter()
  if (report.errorCount) {
    console.log(formatter(report.results))
    process.exit(1)
  }

  const htmlReport = htmlLint()
  if (htmlReport.errorCount) {
    console.log(htmlReport)
    process.exit(1)
  }
}
