import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { QuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { useRef, useState } from 'react'
import {
  wsCreate,
  wsCreated,
  wsSend,
  wsReceived,
  wsClose,
  wsClosed,
  wsError,
  requestMediaAccess,
  generateWebSocketID,
  audioGetSource
} from '@utils'
import { mainFetch } from './utils'
import { AudioCapturer } from './utils/audioCapturer'

function App() {
  const wsKey = generateWebSocketID()
  // 连接时禁用按钮
  const [isRecording, setIsRecording] = useState(false)
  const canSendMessage = useRef(false)

  const wsUrl = useRef('')
  const audioCapturerRef = useRef()
  const questionList = ['11111', '222222', '333333']
  const {
    VITE_TENCENT_APPID,
    VITE_TENCENT_ENGINEMODE,
    VITE_TENCENT_SECRETID,
    VITE_TENCENT_SECRETKEY,
    VITE_GOOGLE_AI_STUIDO_KEY
  } = window.localEnv

  const connectAudioRecongnizorServer = () => {
    const time = new Date().getTime()
    const baseURL = `asr.cloud.tencent.com/asr/v2/${VITE_TENCENT_APPID}?`
    const params = {
      secretid: VITE_TENCENT_SECRETID,
      timestamp: Math.round(time / 1000),
      expired: Math.round(time / 1000) + 24 * 60 * 60,
      nonce: Math.round(time / 100000),
      engine_model_type: VITE_TENCENT_ENGINEMODE,
      voice_id: uuidv4(),
      voice_format: 1
    }
    const paramsStr = queryString.stringify(params)
    const signature = encodeURI(
      CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(baseURL + paramsStr, VITE_TENCENT_SECRETKEY))
    )
    // 记录最终请求地址
    wsUrl.current = `wss://${baseURL + paramsStr}&signature=${signature}`

    // 连接语音识别服务器
    wsCreate(wsKey, wsUrl.current)
  }

  // 连接创建成功
  wsCreated((res) => {
    if (res.key === wsKey && res.code === 200) {
      // 连接成功
    }
  })
  // 接收到消息
  wsReceived((res) => {
    if (res.key === wsKey) {
      const data = JSON.parse(res.originData)
      console.log('接收到服务器消息 >> :', data)
      switch (data.code) {
        case 0:
          if (data.message_id === undefined) {
            // 握手成功,可以开始发送数据
            canSendMessage.current = true
          } else {
            console.log(data.result)
            if (data.final) {
              if (audioCapturerRef.current) {
                audioCapturerRef.current.stop()
              }
            }
          }
          break
        case 4002:
          // 鉴权失败
          console.log(data.message)
          if (audioCapturerRef.current) {
            audioCapturerRef.current.stop()
          }
          canSendMessage.current = false
          break
        case 4007:
          // 编码错误
          console.log(data.message)
          if (audioCapturerRef.current) {
            audioCapturerRef.current.stop()
          }
          canSendMessage.current = false
          break
      }
    }
  })
  // 连接关闭
  wsClosed((res) => {
    if (res.key === wsKey) {
      console.log('连接关闭')
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      canSendMessage.current = false
    }
  })
  // 连接错误处理
  wsError((res) => {
    if (res.key === wsKey) {
      console.log('连接报错')
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      canSendMessage.current = false
    }
  })

  const getAudioData = async () => {
    await requestMediaAccess('microphone')
    const source = await audioGetSource('app', '腾讯会议')
    if (!source) {
      console.log('请检查是否打开腾讯会议')
      // 立即关闭时，可能连接还未建立成功
      setTimeout(() => {
        wsClose(wsKey)
      }, 1500)
      return
    }
    audioCapturerRef.current = new AudioCapturer(
      source,
      (data) => {
        if (canSendMessage.current && data) {
          wsSend(wsKey, data)
        }
      },
      () => {
        canSendMessage.current = false
      },
      () => {
        canSendMessage.current = false
      }
    )
    audioCapturerRef.current.start()
    setIsRecording(true)
  }

  const handleStart = () => {
    connectAudioRecongnizorServer()
    if (audioCapturerRef.current) {
      if (isRecording) {
        audioCapturerRef.current.stop()
        setIsRecording(false)
        canSendMessage.current = false
        wsClose(wsKey)
      }
      audioCapturerRef.current.start()
      setIsRecording(true)
      return
    }
    getAudioData()
  }

  const getAnswer = async () => {
    console.log(VITE_GOOGLE_AI_STUIDO_KEY)
    const result = await mainFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse&key=${VITE_GOOGLE_AI_STUIDO_KEY}`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/json', 'No-Buffer': true }
      },
      { contents: [{ parts: [{ text: 'Write long a story about a magic backpack.' }] }] }
    )
    console.log(result)
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
          <Prompt handleStart={handleStart} handleRegenerate={getAnswer} />
        </Content>
      </Layout>
    </>
  )
}

export default App
