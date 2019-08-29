const getWorkspaces = pkg => {
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

const getPackageWhitelist = pkg => {
  const whitelist = ['catalog-ui-search', 'imperio', '@connexta'].concat(
    pkg.ace ? pkg.ace.whitelist : []
  )
  return whitelist
}

const getResolves = pkg => {
  return [].concat(pkg.ace && pkg.ace.resolve ? pkg.ace.resolve : [])
}

const getTemplatePath = pkg => {
  return pkg.ace && pkg.ace.templatePath ? pkg.ace.templatePath : undefined
}

module.exports = {
  getWorkspaces,
  getPackageWhitelist,
  getResolves,
  getTemplatePath,
}
