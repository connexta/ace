const getWorkspaces = (pkg) => {
    const workspaces = []
        .concat(pkg.workspaces ? pkg.workspaces : [])
        .concat(pkg.ace ? pkg.ace.features : [])
    return workspaces
}

module.exports = {
    getWorkspaces
}
