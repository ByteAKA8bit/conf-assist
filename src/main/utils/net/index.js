import { net } from 'electron'

/**
 * http请求
 * @param {string} url
 * @param {object} options
 * @param {any} body
 * @returns
 */
export const fetchRequest = (url, options, body) => {
  return new Promise((resolve, reject) => {
    try {
      const request = net.request({
        url: url,
        ...options,
      })
      // Post请求
      if (options.method.toLowerCase() === 'post') {
        if (body) {
          request.write(JSON.stringify(body))
        }
      }

      request.on('response', (response) => {
        const chunkList = []

        response.on('data', (chunk) => {
          const data = new TextDecoder().decode(chunk).slice(5)

          console.log(JSON.parse(data))
          // 这里向子进程发送结果
          chunkList.push(chunk)
        })
        response.on('end', async () => {
          // 这里向子进程发送结束
          console.log(chunkList.join('').toString())
          resolve(chunkList)
        })
        if (response.statusCode === 200) {
          resolve(null)
        }
      })
      request.on('error', reject)
      request.end()
    } catch (error) {
      reject(error)
    }
  })
}
