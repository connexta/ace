'use strict'

const path = require('path')

async function importPuppeteer() {
  try {
    return require('puppeteer')
  } catch {
    return (await import('puppeteer')).default
  }
}

function initMocha(reporter) {
  console.log('Browser: Setting up test environment...')

  function shimConsoleLog(console) {
    const log = console.log.bind(console)
    return (...args) => (args.length ? log(...args) : log(''))
  }

  console.log = shimConsoleLog(console)

  function shimMochaInstance(m) {
    console.log('Browser: Shimming Mocha instance...')

    console.log('Browser: Setting up Mocha reporter...')
    m.setup({
      reporter: Mocha.reporters[reporter] || Mocha.reporters.spec,
      ui: 'bdd',
      timeout: 10000,
    })

    m.run()
  }

  function shimMochaProcess(M) {
    console.log('Browser: Setting up Mocha process shim...')
    if (!M.process) M.process = {}
    if (!M.process.stdout) M.process.stdout = {}
    M.process.stdout.write = (data) => console.log('stdout:', data)
    M.reporters.Base.useColors = true
  }

  Object.defineProperty(window, 'mocha', {
    get: () => undefined,
    set: (m) => {
      console.log('Browser: Initializing Mocha...')
      shimMochaInstance(m)
      delete window.mocha
      window.mocha = m
    },
    configurable: true,
  })

  Object.defineProperty(window, 'Mocha', {
    get: () => undefined,
    set: (m) => {
      console.log('Browser: Setting up Mocha constructor...')
      shimMochaProcess(m)
      delete window.Mocha
      window.Mocha = m
    },
    configurable: true,
  })
}

function parseTest(testElement) {
  const passed = testElement.classList.contains('pass')
  const h2Element = testElement.querySelector(':scope > h2')
  const testName = h2Element.firstChild.textContent.trim()

  let error = null
  if (!passed) {
    const errorElement = testElement.querySelector('.error')
    if (errorElement) {
      error = errorElement.textContent.trim()
    }
  }

  return {
    title: testName,
    passed,
    error,
  }
}

function parseSuite(suiteElement) {
  const suiteElements = suiteElement.querySelectorAll(':scope > .suite')
  const suiteHeader = suiteElement.querySelector(':scope > h1').textContent
  if (suiteElements.length === 0) {
    const testElements = suiteElement.querySelectorAll(':scope > ul > .test')
    const tests = []
    testElements.forEach((test) => {
      tests.push(parseTest(test))
    })
    return {
      title: suiteHeader,
      tests,
    }
  } else {
    const suites = []
    suiteElements.forEach((suite) => {
      suites.push(parseSuite(suite))
    })
    const testElements = suiteElement.querySelectorAll(':scope > .test')
    const tests = []
    testElements.forEach((test) => {
      tests.push(parseTest(test))
    })
    return {
      title: suiteHeader,
      suites,
      tests,
    }
  }
}

function parseReport(document) {
  const report = document.querySelector('#mocha-report')
  const suiteElements = report.querySelectorAll(':scope > .suite')
  const suiteInformation = []
  suiteElements.forEach((suite) => {
    suiteInformation.push(parseSuite(suite))
  })
  return suiteInformation
}

let chalk

const init = async () => {
  chalk = (await import('chalk')).default
}

async function printSuite(suite, indent = 0, failures = []) {
  const spacing = '  '.repeat(indent)
  const title =
    suite.title.length > 50 ? suite.title.substring(0, 47) + '...' : suite.title
  console.log(`\n${spacing}📁 ${title}`)
  if (suite.tests) {
    suite.tests.forEach((test) => {
      const indicator = test.passed ? chalk.green('✓') : chalk.red('❌')
      const testTitle = test.passed
        ? test.title.length > 50
          ? test.title.substring(0, 47) + '...'
          : test.title
        : test.title
      console.log(`${spacing}    ${indicator} ${testTitle}`)

      if (!test.passed && test.error) {
        const failureInfo = {
          suite: suite.title,
          test: test.title,
          error: test.error,
        }
        failures.push(failureInfo)
        console.log(
          `${spacing}        ${chalk.red(
            test.error.split('\n').join(`\n${spacing}        `)
          )}`
        )
      }
    })
  }
  if (suite.suites) {
    for (const childSuite of suite.suites) {
      await printSuite(childSuite, indent + 1, failures)
    }
  }
  return failures
}

async function printReport(report) {
  await init()
  console.log('\n📋 Test Report:')
  const failures = []
  for (const suite of report) {
    await printSuite(suite, 0, failures)
  }

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests Summary:')
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}) ${failure.suite}`)
      console.log(`   ${failure.test}`)
      console.log(`\n   ${chalk.red(failure.error.split('\n').join('\n   '))}`)
    })
  }
}

async function runTests({
  file,
  reporter = 'spec',
  timeout = 60000,
  width = 1280,
  height = 800,
  args = [],
  visible = false,
}) {
  console.log('\n🚀 Starting test runner...')
  const puppeteer = await importPuppeteer()

  console.log('📱 Launching browser...')
  const browser = await puppeteer.launch({
    headless: visible ? false : 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--disable-web-security',
      ...args,
    ],
  })

  try {
    console.log('📄 Creating new page...')
    const page = await browser.newPage()

    page.on('console', (msg) => {
      const text = msg.text()
      if (text.startsWith('stdout:')) {
        process.stdout.write(text.slice(7))
      } else if (text.startsWith('Browser:')) {
        console.log(text)
      } else {
      }
    })

    page.on('pageerror', (err) => console.error('Page error:', err))
    page.on('error', (err) => console.error('Critical error:', err))
    page.on('requestfailed', (request) =>
      console.error('Failed request:', request.url(), request.failure())
    )

    console.log(`🖼️  Setting viewport (${width}x${height})...`)
    await page.setViewport({ width, height })

    console.log('🔧 Initializing Mocha...')
    await page.evaluateOnNewDocument(initMocha, reporter)

    const url = /^[a-zA-Z]+:\/\//.test(file)
      ? file
      : `file://${path.resolve(file)}`
    console.log(`📂 Loading test page: ${url}`)

    await page.goto(url, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: 30000,
    })

    await page.waitForFunction(() => window.mocha !== undefined, {
      timeout: 5000,
    })

    console.log('⏳ Waiting for tests to complete...')

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      const result = await page.evaluate(() => {
        const stats = document.querySelector('#mocha-stats')
        if (!stats) return { waiting: true }

        const resultElement = stats.querySelector('.result')
        if (!resultElement) return { waiting: true }

        const passes = parseInt(
          stats.querySelector('.passes em')?.textContent || '0'
        )
        const failures = parseInt(
          stats.querySelector('.failures em')?.textContent || '0'
        )
        const duration = parseFloat(
          stats.querySelector('.duration em')?.textContent || '0'
        )

        const progress = parseFloat(
          stats.querySelector('.progress-element')?.value || '0'
        )
        const reportElement = document.querySelector('#mocha-report')
        return {
          stats: {
            passes,
            failures,
            duration,
            progress,
            reportHtml: reportElement ? reportElement.outerHTML : null,
          },
        }
      })

      if (result.stats && result.stats.progress === 100) {
        console.log('📊 Collecting test results...')
        console.log(
          `✨ Tests completed: ${result.stats.passes} passed, ${result.stats.failures} failed`
        )
        console.log(`⏱️  Duration: ${result.stats.duration}s`)
        console.log(`🧹 Cleaning up browser...`)
        await browser.close()

        const JSDOM = require('jsdom').JSDOM
        const dom = new JSDOM(result.stats.reportHtml)
        const report = parseReport(dom.window.document)

        await printReport(report)

        console.log(
          `\n✨ Final Results: ${result.stats.passes} passed, ${result.stats.failures} failed`
        )

        return {
          passes: result.stats.passes,
          failures: result.stats.failures,
          duration: result.stats.duration,
          progress: result.stats.progress,
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    throw new Error('Test execution timed out')
  } catch (error) {
    console.error('❌ Test execution error:', error)
    await browser.close()
    throw error
  }
}

exports.runner = runTests
