// 定义 IndexedDB 类
class IndexedDB {
  constructor(dbName, dbVersion = 1) {
    this.dbName = dbName
    this.dbVersion = dbVersion
    this.db = null
  }

  // 打开数据库
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        let objectStore = db.objectStoreNames.contains('question')
        if (!objectStore) {
          objectStore = db.createObjectStore('question', { keyPath: 'timestamp' })
        }
      }
    })
  }

  // 关闭数据库
  close() {
    if (this.db) {
      this.db.close()
    }
  }

  // 存入数据
  put(objectStoreName, key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([objectStoreName], 'readwrite')
      const objectStore = transaction.objectStore(objectStoreName)
      const request = objectStore.put(value, key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  // 获取数据
  get(objectStoreName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([objectStoreName], 'readonly')
      const objectStore = transaction.objectStore(objectStoreName)
      const request = objectStore.get(key)

      request.onsuccess = (event) => {
        resolve(event.target.result)
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  // 删除数据
  delete(objectStoreName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([objectStoreName], 'readwrite')
      const objectStore = transaction.objectStore(objectStoreName)
      const request = objectStore.delete(key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  // 查询数据
  query(objectStoreName, indexName, range) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([objectStoreName], 'readonly')
      const objectStore = transaction.objectStore(objectStoreName)
      const index = objectStore.index(indexName)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          resolve(cursor.value)
          cursor.continue()
        } else {
          resolve([])
        }
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }
}

let db = new IndexedDB('database', 1)

export function getDB() {
  if (db) {
    return db
  }
  return (db = new IndexedDB('database', 1))
}
