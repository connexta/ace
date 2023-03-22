export const getWorkspaces = (pkg) => {
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

export const getPackageWhitelist = (pkg) => {
  const whitelist = ['catalog-ui-search', 'imperio', '@connexta'].concat(
    pkg.ace ? pkg.ace.whitelist : []
  )
  return whitelist
}

export const getResolves = (pkg) => {
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

export const getCacheGroups = (pkg) => {
  return [].concat(
    pkg.ace && pkg.ace.cacheGroups
  )
}

export const getTemplatePath = (pkg) => {
  return pkg.ace && pkg.ace.templatePath ? pkg.ace.templatePath : undefined
}

export const getTestPath = (pkg) => {
  return pkg.ace && pkg.ace.testPath ? pkg.ace.testPath : 'src/main/webapp/'
}

export const getTestSetupPath = (pkg) => {
  return pkg.ace && pkg.ace.testSetupPath ? pkg.ace.testSetupPath : null
}

