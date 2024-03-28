// 首先维护一个ws连接池，对所有ws连接做统一管理
// 每个连接都分别使用url做key
const WebSocket = require('ws')
const socketList = []

export function createWebSocket(url, onConnected, onReceived) {
  // 检查连接池中是否有当前url的连接
  if (socketList.find((item) => item.key === url)) {
    return
  }
  const socket = new WebSocket(url)
  // 连接成功后将连接加入到socketList中
  socket.onopen = (event) => {
    if (event.target.readyState === event.target.OPEN) {
      socketList.push({ key: url, socket })
      onConnected()
    }
  }
  // 连接关闭后在socketList中删除该连接
  socket.onclose = () => {
    const index = socketList.findIndex((item) => item.key === url)
    if (typeof index === 'number') {
      socketList.splice(index, 1)
    }
  }
  socket.onerror = () => {
    const index = socketList.findIndex((item) => item.key === url)
    if (typeof index === 'number') {
      socketList.splice(index, 1)
    }
  }
  // 连接在接收到消息时，将消息用key标识，封装一层后返回
  socket.onmessage = (event) => {
    const data = event.data
    onReceived({ key: url, originData: data })
  }
}

export function getWebSocket(url) {
  const socket = socketList.find((item) => (item.key = url))
  if (!socket) {
    return null
  }
  return socket
}

export function closeWebSocket(url) {
  const socket = socketList.find((item) => (item.key = url))
  if (socket) {
    socket.close()
    return true
  }
  return false
}
