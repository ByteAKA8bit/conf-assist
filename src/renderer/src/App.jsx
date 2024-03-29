import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { QuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { useRef, useState } from 'react'

/**
 *
 * # 获取输入的激活码
 * # 解析激活码过期时间，如果未过期，打开聊天窗口
 * 点击开始按钮，监听语音输入
 * 当无语音输入时，发送请求到API
 * 等待API返回后将内容显示在右侧
 */

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const audioContextRef = useRef()
  const questionList = ['11111', '222222', '333333', 'question2', 'question43', 'question5243']

  const { wsCreate, wsReceived, wsSend, requestMediaAccess } = window.api
  const {
    VITE_TENCENT_APPID,
    VITE_TENCENT_ENGINEMODE,
    VITE_TENCENT_SECRETID,
    VITE_TENCENT_SECRETKEY
  } = window.localEnv

  const sendAudioData = async (wsUrl) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      const audioTrack = stream.getAudioTracks()[0]
      const mediaStream = new MediaStream()
      mediaStream.addTrack(audioTrack)
      const mediaStreamSource = audioContextRef.current.createMediaStreamSource(mediaStream)
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
        if (event.data.audioData) {
          wsSend(wsUrl, event.data.audioData)
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
      if (isRecording) {
        audioContextRef.current.suspend()
        setIsRecording(false)
        return
      }
      setIsRecording(true)
      audioContextRef.current.resume()
      return
    }

    await requestMediaAccess('microphone')
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

    wsCreate(wsUrl)
    wsReceived((res) => {
      if (res.key === wsUrl) {
        const data = JSON.parse(res.originData)
        // 连接成功
        if (data.code === 0 && data.message_id === undefined) {
          setIsRecording(true)
          console.log(data)
          sendAudioData(wsUrl)
        }
        // 返回识别结果
        if (data.code === 0 && data.message_id) {
          console.log(data.result)
          if (data.final) {
            console.log('结束')
          }
        }
        if (data.code !== 0) {
          if (audioContextRef.current) {
            audioContextRef.current.close()
          }
          audioContextRef.current = null
          setIsRecording(false)
        }
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
          <Prompt handleStart={handleStart} handleRegenerate={null} isRecording={isRecording} />
        </Content>
      </Layout>
    </>
  )
}

export default App
