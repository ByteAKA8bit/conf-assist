import { parentPort, workerData } from 'worker_threads'

setTimeout(() => {
  parentPort.postMessage(workerData)
}, 1000)
