// 首先维护一个ws连接池，对所有ws连接做统一管理
// 每个连接都需要指定key
const WebSocket = require('ws')
const socketList = []

/**
 * 创建WrbSocket连接
 * @param {string} url url
 * @param {() => void} onConnected 创建成功回调
 * @param {() => void} onReceived 接收到消息的回调
 * @param {() => void} onClosed 连接关闭的回调
 * @param {() => void} onError 连接错误回调
 * @returns
 */
export function createWebSocket(key, url, onConnected, onReceived, onClosed, onError) {
  // 检查连接池中是否有当前url的连接,没有则创建连接
  if (socketList.find((item) => item.key === key)) {
    return
  }
  const socket = new WebSocket(url)
  // 连接成功后将连接加入到socketList中
  socket.onopen = (event) => {
    if (event.target.readyState === event.target.OPEN) {
      socketList.push({ key: key, socket })
      console.log('连接', url, '成功')
      onConnected()
    }
  }
  // 连接在接收到消息时，将消息用key标识，封装一层后返回
  socket.onmessage = (event) => {
    const data = event.data
    console.log(event.data)
    onReceived({ key, originData: data })
  }
  // 连接关闭后在socketList中删除该连接
  socket.onclose = () => {
    const index = socketList.findIndex((item) => item.key === key)
    if (typeof index === 'number') {
      socketList.splice(index, 1)
      console.log(socketList)
      onClosed()
    }
  }
  socket.onerror = () => {
    const index = socketList.findIndex((item) => item.key === key)
    if (typeof index === 'number') {
      socketList.splice(index, 1)
      console.log(socketList)
      onError()
    }
  }
}

export function getWebSocket(key) {
  const socket = socketList.find((item) => (item.key = key))
  if (!socket) {
    return null
  }
  return socket.socket
}

export function closeWebSocket(key) {
  const socket = socketList.find((item) => (item.key = key))
  if (socket) {
    socket.close()
    return true
  }
  return false
}
