export const runWorker = (worker, workerData, onMessage) => {
  return new Promise((resolve, reject) => {
    const workerInstance = worker({ workerData })
    workerInstance.on('message', onMessage)
    workerInstance.on('error', reject)
    workerInstance.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`stopped with  ${code} exit code`))
      }
      resolve(code)
    })
    resolve(workerInstance)
  })
}
