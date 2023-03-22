import { resolve } from 'path'
import { config, install } from 'maven-deploy'

const extract = ($, selectors) =>
  Object.keys(selectors).reduce((o, key) => {
    o[key] = $(selectors[key]).text()
    return o
  }, {})

const info = {
  version: 'project > parent > version',
  groupId: 'project > groupId',
  artifactId: 'project > artifactId',
}

export default ({ args, getPackage, getPom }) => {
  const pkg = getPackage()
  config(
    Object.assign(
      {
        classifier: pkg.name,
        buildDir: '.',
        type: 'jar',
      },
      extract(getPom(), info)
    )
  )
  install(resolve('target', pkg.name + '.jar'))
}
