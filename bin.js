#!/usr/bin/env node

const fs = require('fs')
const program = require('commander')

const find = require('find-up')
const cheerio = require('cheerio')

const wrap = (path) => (args = {}) => {
  const cmd = require(path)

  const getPackage = () => require(find.sync('package.json'))
  const getPom = () =>
    cheerio.load(
      fs.readFileSync(find.sync(['.flattened-pom.xml', 'pom.xml']), {
        encoding: 'utf8',
      }),
      {
        xmlMode: true,
        decodeEntities: false,
      }
    )

  cmd({ args, getPackage, getPom })
}

const pkg = require('./package.json')

program.version(pkg.version)
program.description(pkg.description)

program
  .command('package')
  .description('build a jar')
  .action(wrap('./lib/package'))

program
  .command('set-env [args...]')
  .description('run args with `ACE_BUILD` environment variable set')
  .action(wrap('./lib/set-env'))

program
  .command('install')
  .description('install a jar into ~/.m2')
  .action(wrap('./lib/install'))

program
  .command('clean')
  .description('remove target directory')
  .option('-w, --workspaces', 'only clean workspaces')
  .action(wrap('./lib/clean'))

program
  .command('test')
  .description('run mocha tests in a headless browser')
  .option(
    '--url <location>',
    'location to find tests (default: ./target/test/index.html)'
  )
  .option('-w, --width <number>', 'browser window width (default: 1280)')
  .option('-h, --height <number>', 'browser window height (default: 800)')
  .option('-v, --visible', 'browser visibility (default: false)')
  .option(
    '-t, --timeout <number>',
    'test timeout in seconds (default: 900 seconds)'
  )
  .action(wrap('./lib/test'))

program
  .command('lint')
  .description('run codice linter')
  .option('-f, --fix', 'fix errors that are found')
  .action(wrap('./lib/lint'))

program
  .command('format')
  .description('run formatter')
  .option('-m, --modified', 'only run against modified code')
  .option('-w, --write', 'fix errors that are found')
  .option('-l, --license <path-to-license-file>', 'path to license file')
  .action(wrap('./lib/format'))

program
  .command('pom')
  .description('verify/fix the root pom')
  .option('-f, --fix', 'sync pom with packages')
  .action(wrap('./lib/pom'))

program
  .command('gen-feature')
  .description('generate a feature file')
  .option(
    '-e, --extend [<feature-file>]',
    'extend an existing feature file',
    (val) => val.split(',')
  )
  .option('-x, --exclude [projects]', 'exclude existing wabs', (val) =>
    val.split(',')
  )
  .action(wrap('./lib/gen-feature'))

program
  .command('bundle')
  .description('bundle webapp')
  .option(
    '--middleware <file>',
    'add express middleware before webpack dev server'
  )
  .option(
    '--tsTranspileOnly <tsTranspileOnly>',
    'only transpile typescript (default is false)'
  )
  .option('-e, --env <env>', 'build environment <development|test|production>')
  .action(wrap('./lib/bundle'))

program
  .command('start')
  .description('start the dev server')
  .option('-N, --no-open', 'do not open default browser')
  .option(
    '--tsTranspileOnly <tsTranspileOnly>',
    'only transpile typescript (default is false)'
  )
  .option(
    '-a, --auth <auth>',
    'auth <username:password> (default: admin:admin)'
  )
  .option('-e, --env <env>', 'build environment <development|test|production>')
  .option(
    '--proxy <target>',
    'set proxy target (default: https://localhost:8993)'
  )
  .option('--main <script>', 'the javascript entry file')
  .option('--contextPath <path>', 'context path to start server on')
  .option('--port <port>', 'dev server port (default: 8080)')
  .option('--host <host>', 'dev server host (default: localhost)')
  .option(
    '--middleware <file>',
    'add express middleware before webpack dev server'
  )
  .action(wrap('./lib/start'))

program
  .command('storybook')
  .description('start the storybook server')
  .option('--port <port>', 'dev server port (default: 8080)')
  .option('--host <host>', 'dev server host (default: localhost)')
  .option('--static', 'Build static version of storybook.')
  .option('--root <path>', 'Root directory to search for stories.')
  .action(wrap('./lib/storybook'))

program
  .command('disable-idp')
  .description('disable idp authentication in running ddf instance')
  .option(
    '-a, --auth <auth>',
    'auth <username:password> (default: admin:admin)'
  )
  .option('--port <port>', 'ddf server port (default: 8993)')
  .option('--host <host>', 'ddf server host (default: localhost)')
  .option('--whitelist <context-path>', 'adds a context path to the whitelist')
  .action(wrap('./lib/disable-idp'))

program.parse(process.argv)
