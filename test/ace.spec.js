import { resolve as _resolve, dirname } from 'path'
import { strictEqual as equal } from 'assert'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { stat as _stat, access as _access, writeFile as _writeFile } from 'fs'
import * as urlImport from 'url';
const __dirname = urlImport.fileURLToPath(new URL('.', import.meta.url));
const writeFile = promisify(_writeFile)
const rimraf = promisify(import('rimraf'))
const mkdirp = promisify(import('mkdirp'))

const isFile = (path) =>
  new Promise((resolve) => {
    _stat(path, (err, stat) => {
      resolve(err === null && stat.isFile())
    })
  })

const isDirectory = (path) =>
  new Promise((resolve) => {
    _stat(path, (err, stat) => {
      resolve(err === null && stat.isDirectory())
    })
  })

const generateProject = (opts) => {
  return Object.assign(
    {
      'package.json': JSON.stringify(
        {
          name: 'example-project',
          license: 'MIT',
          main: 'src/main/webapp/index.js',
          'context-path': './',
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
    Object.keys(project).map(async (filePath) => {
      const absolutePath = _resolve(root, filePath)
      await mkdirp(dirname(absolutePath))
      await writeFile(absolutePath, project[filePath])
    })
  )
}

const resolve = (...args) => {
  return _resolve(__dirname, 'example-project', ...args)
}

const ace = (...args) =>
  new Promise((done) => {
    const cwd = resolve()
    const stdio = 'ignore'
    //const stdio = 'inherit' // Uncomment to debug ace output
    const bin = _resolve(__dirname, '..', 'bin.js')
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
  }).timeout(60000)
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

describe.skip('ace with async failures', () => {
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
  // is this flaky?
  // - yes
  it('ace test', async () => {
    equal(await ace('test', 'target/test/index.html'), 1)
  })
  it('should tear down', async () => {
    await rimraf(root)
  })
})
