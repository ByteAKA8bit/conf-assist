import HttpsRequestWorker from './httpWorker?nodeWorker'

const Workers = {
  https: HttpsRequestWorker
}

export const runWorker = (type, workerData) => {
  return new Promise((resolve, reject) => {
    const worker = Workers[type]({ workerData })
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
