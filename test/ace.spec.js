const path = require('path')
const { strictEqual: equal } = require('assert')
const { spawn } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')

const stat = promisify(fs.stat)
const access = promisify(fs.access)
const writeFile = promisify(fs.writeFile)
const rimraf = promisify(require('rimraf'))
const mkdirp = promisify(require('mkdirp'))

const isFile = path =>
  new Promise(resolve => {
    fs.stat(path, (err, stat) => {
      resolve(err === null && stat.isFile())
    })
  })

const isDirectory = path =>
  new Promise(resolve => {
    fs.stat(path, (err, stat) => {
      resolve(err === null && stat.isDirectory())
    })
  })

const generateProject = opts => {
  return Object.assign(
    {
      'package.json': JSON.stringify(
        {
          name: 'example-project',
          license: 'MIT',
          main: 'src/main/webapp/index.js',
          'context-path': '/my-app',
        },
        null,
        2
      ),
      'pom.xml': '',
      'src/main/webapp/index.js': `module.exports = () => 'hello, world'`,
      'src/main/webapp/example.spec.js': `it('should pass', () => {})`,
    },
    opts
  )
}

const writeProject = (root, project) => {
  return Promise.all(
    Object.keys(project).map(async filePath => {
      const absolutePath = path.resolve(root, filePath)
      await mkdirp(path.dirname(absolutePath))
      await writeFile(absolutePath, project[filePath])
    })
  )
}

const resolve = (...args) => {
  return path.resolve(__dirname, 'example-project', ...args)
}

const ace = (...args) =>
  new Promise(done => {
    const cwd = resolve()
    const stdio = 'ignore'
    //const stdio = 'inherit' // Uncomment to debug ace output
    const bin = path.resolve(__dirname, '..', 'bin.js')
    const ps = spawn(bin, args, { stdio, cwd })
    ps.on('exit', done)
  })

describe('ace', () => {
  const root = resolve()
  it('should setup', async () => {
    const project = generateProject()
    await rimraf(root)
    await writeProject(root, project)
  })
  it('ace --help', async () => {
    equal(await ace('--help'), 0)
  })
  it('ace clean', async () => {
    equal(await ace('clean'), 0)
    equal(await isDirectory(resolve('target')), false)
  })
  it('ace bundle', async () => {
    equal(await ace('bundle'), 0)
    equal(await isFile(resolve('target', 'webapp', 'index.html')), true)
  }).timeout(60000)
  it('ace bundle --env=test', async () => {
    equal(await ace('bundle', '--env', 'test'), 0)
    equal(await isFile(resolve('target', 'test', 'index.html')), true)
    equal(await isFile(resolve('target', 'test', 'test.js')), true)
  }).timeout(60000)
  it('ace test', async () => {
    equal(await ace('test', 'target/test/index.html'), 0)
  })
  it('should tear down', async () => {
    await rimraf(root)
  })
})

describe('ace production build', () => {
  const root = resolve()
  it('should setup', async () => {
    const project = generateProject()
    await rimraf(root)
    await writeProject(root, project)
  })
  it('ace bundle --env=production', async () => {
    equal(await ace('bundle', '--env', 'production'), 0)
    equal(await isFile(resolve('target', 'webapp', 'index.html')), true)
  }).timeout(60000)
  it('should tear down', async () => {
    await rimraf(root)
  })
})

describe('ace with async failures', () => {
  const root = resolve()
  it('should setup', async () => {
    const project = generateProject({
      'src/main/webapp/example.spec.js': `
        async function main() {
          throw new Error('test')
        }
        describe('failing test', () => {
          main()
          it('should pass', () => {})
        })
      `,
    })
    await rimraf(root)
    await writeProject(root, project)
  })
  it('ace bundle --env=test', async () => {
    equal(await ace('bundle', '--env', 'test'), 0)
  }).timeout(60000)
  it('ace test', async () => {
    equal(await ace('test', 'target/test/index.html'), 1)
  })
  it('should tear down', async () => {
    await rimraf(root)
  })
})
