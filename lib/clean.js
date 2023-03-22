import { resolve, join } from 'path'
import { sync } from 'rimraf'
import { sync as _sync } from 'glob'
import { getWorkspaces } from './package-utils.js'

const flatten = (l, v) => l.concat(v)

const getTargets = (pkg, onlyWorkspaces) => {
  const targets = onlyWorkspaces ? [] : [resolve('target')]

  if (!pkg.workspaces) {
    return targets
  }

  const workspaces = getWorkspaces(pkg)
    .map((d) => resolve(d))
    .map((d) => _sync(d))
    .reduce(flatten, [])
    .map((d) => join(d, 'target'))

  return targets.concat(workspaces)
}

export default ({ args, getPackage }) => {
  getTargets(getPackage(), args.workspaces).forEach((directory) => {
    sync(directory)
    console.log('ace info removed ' + directory)
  })
}
