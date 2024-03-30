import { parentPort, workerData } from 'worker_threads'

if (!parentPort) {
  throw new Error('IllegalState')
}

// 从 workerData 中获取到url和options
const { url, options } = workerData

setTimeout(() => {
  parentPort.postMessage({ code: 200, message: 'success', data: { url, options } })
}, 1000)
