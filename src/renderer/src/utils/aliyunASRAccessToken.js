import CryptoJS from 'crypto-js'
import qs from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import { CorsProxyBaseUrl } from './constant'

function encodeText(text) {
  return encodeURIComponent(text).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
}

function encodeDict(obj) {
  const keys = Object.keys(obj).sort()
  const sortedParams = {}
  keys.forEach((key) => {
    sortedParams[key] = obj[key]
  })
  return qs.stringify(sortedParams).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
}

async function getToken(accessKeyId, accessKeySecret) {
  // 读取localstorage中的toke
  const token = localStorage.AliyunASRToken
  const expired = Number(localStorage.AliyunASRTokenExpireTime)
  const currentTime = new Date().getTime() / 1000 + 24 * 60 * 60
  if (currentTime <= expired) {
    return token
  }
  const parameters = {
    AccessKeyId: accessKeyId,
    Action: 'CreateToken',
    Format: 'JSON',
    RegionId: 'cn-shanghai',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: uuidv4(),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString(),
    Version: '2019-02-28',
  }

  const queryString = encodeDict(parameters)

  const stringToSign = `GET&${encodeText('/')}&${encodeText(queryString)}`

  const signature = CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA1(stringToSign, `${accessKeySecret}&`),
  )
  const encodedSignature = encodeText(signature)

  const hostname = 'nls-meta.cn-shanghai.aliyuncs.com'
  const pathName = `/?Signature=${encodedSignature}&${queryString}`

  const fullUrl = `${CorsProxyBaseUrl}${pathName}&hostname=${hostname}`

  const response = await fetch(fullUrl).catch((error) => {
    console.error(error)
  })
  const data = await response.json()
  localStorage.AliyunASRToken = data.Token.Id
  localStorage.AliyunASRTokenExpireTime = data.Token.ExpireTime
  return data.Token.Id
}

export default getToken
