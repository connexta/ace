const getWorkspaces = (pkg) => {
  const workspaces = []
    .concat(
      pkg.workspaces && pkg.workspaces.packages === undefined
        ? pkg.workspaces
        : []
    )
    .concat(
      pkg.workspaces && pkg.workspaces.packages !== undefined
        ? pkg.workspaces.packages
        : []
    )
    .concat(pkg.ace ? pkg.ace.features : [])
  return workspaces
}

const getPackageWhitelist = (pkg) => {
  const whitelist = ['catalog-ui-search', 'imperio', '@connexta'].concat(
    pkg.ace ? pkg.ace.whitelist : []
  )
  return whitelist
}

const getResolves = (pkg) => {
  return [].concat(
    pkg.ace && pkg.ace.resolve
      ? Object.keys(pkg.ace.resolve).map((key) => {
          return {
            key,
            value: pkg.ace.resolve[key],
          }
        })
      : []
  )
}

const getTemplatePath = (pkg) => {
  return pkg.ace && pkg.ace.templatePath ? pkg.ace.templatePath : undefined
}

const getTestPath = (pkg) => {
  return pkg.ace && pkg.ace.testPath ? pkg.ace.testPath : 'src/main/webapp/'
}

module.exports = {
  getWorkspaces,
  getPackageWhitelist,
  getResolves,
  getTemplatePath,
  getTestPath,
}
