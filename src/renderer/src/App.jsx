import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { QuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { useEffect, useRef, useState } from 'react'
import {
  wsCreate,
  wsCreated,
  wsSend,
  wsReceived,
  wsClose,
  wsClosed,
  wsError,
  requestMediaAccess,
  generateWebSocketID
} from '@utils'

function App() {
  // 连接时禁用按钮
  const wsKey = generateWebSocketID()
  const [connectingServer, setConnectingServer] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const canSendMessage = useRef(false)

  const wsUrl = useRef('')
  const audioContextRef = useRef()
  const questionList = ['11111', '222222', '333333']
  const {
    VITE_TENCENT_APPID,
    VITE_TENCENT_ENGINEMODE,
    VITE_TENCENT_SECRETID,
    VITE_TENCENT_SECRETKEY
  } = window.localEnv

  useEffect(() => {
    // 开启语音记录
    getAudioData()
  }, [])

  const getAudioData = async () => {
    try {
      await requestMediaAccess('microphone')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      const mediaStreamSource = audioContextRef.current.createMediaStreamSource(stream)
      await audioContextRef.current.audioWorklet.addModule('audioStream2BinaryProcessor.js')
      const audioProcessorNode = new AudioWorkletNode(
        audioContextRef.current,
        'audio-stream-to-binary-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1
        }
      )
      audioProcessorNode.port.onmessage = (event) => {
        console.log(canSendMessage)
        if (canSendMessage && event.data.audioData) {
          // console.log(event.data.audioData)
          wsSend(wsKey, event.data.audioData)
        }
      }
      mediaStreamSource &&
        mediaStreamSource.connect(audioProcessorNode).connect(audioContextRef.current.destination)
    } catch (error) {
      console.log(error)
    }
  }

  const handleStart = async () => {
    if (audioContextRef.current) {
      // 当前正在记录
      if (isRecording) {
        setIsRecording(false)
        audioContextRef.current.suspend()
        canSendMessage.current = false
        // 关闭服务器连接
        wsClose(wsKey)
        return
      }
      setIsRecording(true)
      audioContextRef.current.resume()
    }

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
    // 记录最终请求地址
    wsUrl.current = `wss://${baseURL + paramsStr}&signature=${signature}`

    // 连接语音识别服务器
    wsCreate(wsKey, wsUrl.current)
    // 设置连接语音识别服务器状态为true
    setConnectingServer(true)

    // 当连接创建成功
    wsCreated((res) => {
      if (res.key === wsKey && res.code === 200) {
        console.log('连接创建成功')
        setConnectingServer(false)
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
              // 服务器返回握手成功,可以开始发送数据
              canSendMessage.current = true
            } else {
              console.log(data.result)
              if (data.final) {
                if (audioContextRef.current) {
                  audioContextRef.current.suspend()
                }
              }
            }
            break
          case 4002:
            console.log(data.message)
            if (audioContextRef.current) {
              audioContextRef.current.suspend()
            }
            canSendMessage.current = false
            setIsRecording(false)
            break
          case 4007:
            console.log(data.message)
            if (audioContextRef.current) {
              audioContextRef.current.suspend()
            }
            canSendMessage.current = false
            setIsRecording(false)
            break
        }
      }
    })
    // 连接关闭
    wsClosed((res) => {
      if (res.key === wsKey) {
        console.log('连接关闭')
        if (audioContextRef.current) {
          audioContextRef.current.suspend()
        }
        canSendMessage.current = false
        setConnectingServer(false)
        setIsRecording(false)
      }
    })
    wsError((res) => {
      if (res.key === wsKey) {
        console.log('连接报错')
        if (audioContextRef.current) {
          audioContextRef.current.suspend()
        }
        canSendMessage.current = false
        setConnectingServer(false)
        setIsRecording(false)
      }
    })
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
          <Prompt
            handleStart={handleStart}
            handleRegenerate={null}
            connecting={connectingServer}
            isRecording={isRecording}
          />
        </Content>
      </Layout>
    </>
  )
}

export default App
