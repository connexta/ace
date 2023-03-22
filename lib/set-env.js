import spawn from 'cross-spawn'

export default ({ args: [cmd, ...args], getPackage }) => {
  const pkg = getPackage()
  spawn(cmd, args, {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { ACE_BUILD: Date.now() }),
  }).on('exit', process.exit)
}
