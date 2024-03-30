import exampleWorker from './example?nodeWorker'

export const runWorker = (workerData) => {
  return new Promise((resolve, reject) => {
    const worker = exampleWorker({ workerData })
    worker.on('message', (response) => {
      resolve(response)
    })
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`stopped with  ${code} exit code`))
      }
    })
  })
}
