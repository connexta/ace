function handleError(error) {
  if (typeof window.onerror === 'function') {
    window.onerror(
      error.stack || error.message,
      error.filename,
      error.lineno,
      error.colno,
      error
    )
  } else {
    setTimeout(() => handleError(error), 0)
  }
}

window.addEventListener('error', handleError)
window.addEventListener('unhandledrejection', error => {
  handleError(error.reason)
})
