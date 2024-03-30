const { net } = require('electron')

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
        ...options
      })
      if (options.method.toLowerCase() === 'post') {
        request.write(JSON.stringify(body))
      }
      request.on('response', (response) => {
        const chunkList = []
        response.on('data', (chunk) => {
          chunkList.push(chunk)
        })
        response.on('end', () => {
          resolve(chunkList.join(''))
        })
      })
      request.on('error', reject)
      request.end()
    } catch (error) {
      reject(error)
    }
  })
}
