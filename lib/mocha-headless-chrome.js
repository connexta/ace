'use strict'

const path = require('path')
const util = require('util')
const puppeteer = require('puppeteer')

function initMocha(reporter) {
  console.log = ((console) => {
    const log = console.log.bind(console)
    return (...args) => (args.length ? log(...args) : log(''))
  })(console)

  function shimMochaInstance(m) {
    const originalReporter = m.reporter.bind(m)
    let reporterIsChanged = false

    m.reporter = (...args) => {
      reporterIsChanged = true
      originalReporter(...args)
    }

    const run = m.run.bind(m)

    m.run = () => {
      const all = [],
        pending = [],
        failures = [],
        passes = []

      function error(err) {
        if (!err) return {}

        let res = {}
        Object.getOwnPropertyNames(err).forEach((key) => (res[key] = err[key]))
        return res
      }

      function clean(test) {
        return {
          title: test.title,
          fullTitle: test.fullTitle(),
          duration: test.duration,
          err: error(test.err),
        }
      }

      function result(stats) {
        return {
          result: {
            stats: {
              tests: all.length,
              passes: passes.length,
              pending: pending.length,
              failures: failures.length,
              start: stats.start.toISOString(),
              end: stats.end.toISOString(),
              duration: stats.duration,
            },
            tests: all.map(clean),
            pending: pending.map(clean),
            failures: failures.map(clean),
            passes: passes.map(clean),
          },
          coverage: window.__coverage__,
        }
      }

      function setResult() {
        !window.__mochaResult__ && (window.__mochaResult__ = result(this.stats))
      }

      !reporterIsChanged &&
        m.setup({
          reporter: Mocha.reporters[reporter] || Mocha.reporters.spec,
        })

      const runner = run(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            setResult.call(runner)
            resolve()
          }, 100)
        })
      })
        .on('pass', (test) => {
          passes.push(test)
          all.push(test)
        })
        .on('fail', (test) => {
          failures.push(test)
          all.push(test)
        })
        .on('pending', (test) => {
          pending.push(test)
          all.push(test)
        })
        .on('end', setResult)

      return runner
    }
  }

  function shimMochaProcess(M) {
    // Mocha needs a process.stdout.write in order to change the cursor position.
    !M.process && (M.process = {})
    !M.process.stdout && (M.process.stdout = {})

    M.process.stdout.write = (data) => console.log('stdout:', data)
    M.reporters.Base.useColors = true
    M.reporters.none = function None(runner) {
      M.reporters.Base.call(this, runner)
    }
  }

  Object.defineProperty(window, 'mocha', {
    get: function () {
      return undefined
    },
    set: function (m) {
      shimMochaInstance(m)
      delete window.mocha
      window.mocha = m
    },
    configurable: true,
  })

  Object.defineProperty(window, 'Mocha', {
    get: function () {
      return undefined
    },
    set: function (m) {
      shimMochaProcess(m)
      delete window.Mocha
      window.Mocha = m
    },
    configurable: true,
  })
}

async function configureViewport(width, height, page) {
  if (!width && !height) return page

  const currentViewport = page.viewport() || { width: 800, height: 600 }
  await page.setViewport({
    width: width || currentViewport.width,
    height: height || currentViewport.height,
    deviceScaleFactor: currentViewport.deviceScaleFactor || 1,
  })
  return page
}

async function handleConsole(msg) {
  const args = msg.args()
  const resolvedArgs = await Promise.all(
    args.map(async (arg) => await arg.jsonValue())
  )

  // process stdout stub
  let isStdout = resolvedArgs[0] === 'stdout:'
  isStdout && (resolvedArgs = resolvedArgs.slice(1))

  let message = util.format(...resolvedArgs)
  !isStdout && (message += '\n')
  process.stdout.write(message)
}

function prepareUrl(filePath) {
  if (/^[a-zA-Z]+:\/\//.test(filePath)) {
    // path is URL
    return filePath
  }

  // local path
  let resolvedPath = path.resolve(filePath)
  return `file://${resolvedPath}`
}

exports.runner = async function ({
  file,
  reporter,
  timeout,
  width,
  height,
  args,
  executablePath,
  visible,
}) {
  // validate options
  if (!file) {
    throw new Error('Test page path is required.')
  }

  args = [].concat(args || []).map((arg) => '--' + arg)
  !timeout && (timeout = 60000)

  const url = prepareUrl(file)

  const options = {
    ignoreHTTPSErrors: true,
    headless: visible ? false : 'new',
    executablePath,
    args,
  }

  const browser = await puppeteer.launch(options)
  try {
    const pages = await browser.pages()
    const page = pages[0] || (await browser.newPage())

    await configureViewport(width, height, page)

    page.on('console', handleConsole)
    page.on('dialog', (dialog) => dialog.dismiss())
    page.on('pageerror', (err) => {
      console.error('Page Error:', err)
      page.evaluate((message) => {
        window?.onerror(message)
      }, err.message)
    })

    await page.evaluateOnNewDocument(initMocha, reporter)
    await page.goto(url)

    const result = await page.waitForFunction(() => window.__mochaResult__, {
      timeout: timeout,
    })

    const mochaResult = await result.jsonValue()
    await browser.close()
    return mochaResult
  } catch (error) {
    await browser.close()
    throw error
  }
}
