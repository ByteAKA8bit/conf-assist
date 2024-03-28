import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { QuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { useState } from 'react'

/**
 *
 * # 获取输入的激活码
 * # 解析激活码过期时间，如果未过期，打开聊天窗口
 * 点击开始按钮，监听语音输入
 * 当无语音输入时，发送请求到API
 * 等待API返回后将内容显示在右侧
 */

function App() {
  const [voiceID, setVoiceID] = useState('')
  const questionList = ['11111', '222222', '333333', 'question2', 'question43', 'question5243']

  const { wsCreate, wsReceived } = window.api
  const {
    VITE_TENCENT_APPID,
    VITE_TENCENT_ENGINEMODE,
    VITE_TENCENT_SECRETID,
    VITE_TENCENT_SECRETKEY
  } = window.localEnv

  const handleStart = async () => {
    const baseURL = `asr.cloud.tencent.com/asr/v2/${VITE_TENCENT_APPID}?`
    const params = {
      secretid: VITE_TENCENT_SECRETID,
      timestamp: Math.floor(Date.now() / 1000),
      expired: Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000),
      nonce: Math.floor(Math.random() * 10000000000) + 1,
      engine_model_type: VITE_TENCENT_ENGINEMODE,
      voice_id: uuidv4(),
      needvad: 1,
      filter_modal: 1
    }

    const paramsStr = queryString.stringify(params)
    const signature = encodeURI(
      CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(baseURL + paramsStr, VITE_TENCENT_SECRETKEY))
    )
    const wsUrl = `wss://${baseURL + paramsStr}&signature=${signature}`
    // 建立连接
    if (!voiceID) {
      wsCreate(wsUrl)
      wsReceived((res) => {
        if (res.key === wsUrl) {
          const data = JSON.parse(res.originData)
          if (data.code === 0) {
            setVoiceID(data.voice_id)
            // 开始录音并传输
          }
        }
      })
    } else {
      wsReceived((res) => {
        if (res.key === wsUrl) {
          const data = JSON.parse(res.originData)
          // 接收数据
          console.log(data)
        }
      })
    }
  }

  return (
    <>
      <Topbar />
      <Layout className="bg-zinc-700">
        <Sidebar className="p-2">
          <QuestionList list={questionList} />
        </Sidebar>
        <Content className="p-2 flex flex-col bg-zinc-600">
          <div className="flex-1">回答</div>
          <Prompt handleStart={handleStart} handleRegenerate={null} />
        </Content>
      </Layout>
    </>
  )
}

export default App
