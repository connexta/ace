const { runner } = require('./mocha-headless-chrome')

module.exports = ({ args, getPackage }) => {
  const {
    url = './target/test/index.html',
    width = 1280,
    height = 800,
    timeout = 15 * 60,
    visible = false,
  } = args

  console.log('\n🔍 Starting test execution...')
  console.log(`📌 Test file: ${url}`)
  console.log(`⏱️  Timeout: ${timeout} seconds`)

  const testPromise = runner({
    file: url,
    width,
    height,
    timeout: timeout * 1000,
    visible,
  })

  const timeoutPromise = new Promise((_, reject) => {
    const timeoutMs = timeout * 1000 + 5000
    console.log(`⚠️  Setting safety timeout: ${timeoutMs / 1000} seconds`)
    setTimeout(() => reject(new Error('Test execution timed out')), timeoutMs)
  })

  console.log('⏳ Running tests...\n')

  Promise.race([testPromise, timeoutPromise])
    .then((result) => {
      console.log('\n🏁 Test execution completed')
      if (result.failures > 0) {
        console.log('❌ Tests failed')
        process.exit(1)
      }
      console.log('✅ All tests passed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test execution failed:', error)
      process.exit(1)
    })
}
