import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { ForwardQuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { useEffect, useRef, useState } from 'react'
import {
  wsCreate,
  wsSend,
  wsClose,
  wsCreatedRegister,
  wsReceivedRegister,
  wsClosedRegister,
  wsErrorRegister,
  generateWebSocketID,
  requestMediaAccess,
  audioGetSource
} from '@utils'
import { mainFetch } from './utils'
import { AudioCapturer } from './utils/audioCapturer'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function App() {
  const wsKey = generateWebSocketID()
  // 连接时禁用按钮
  const [isRecording, setIsRecording] = useState(false)
  const [connectingAudioServer, setConnectingAudioServer] = useState(false)
  const [questionList, setQuestionList] = useState([])
  const [newQuestion, setNewQuestion] = useState('')
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0)
  const canSendMessage = useRef(false)

  const divRef = useRef()

  const wsUrl = useRef('')
  const audioCapturerRef = useRef()
  const {
    VITE_TENCENT_APPID,
    VITE_TENCENT_ENGINEMODE,
    VITE_TENCENT_SECRETID,
    VITE_TENCENT_SECRETKEY,
    VITE_GOOGLE_AI_STUIDO_KEY
  } = window.localEnv

  const getAnswer = async (timestamp, question) => {
    setConnectingAudioServer(() => true)
    const result = await mainFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${VITE_GOOGLE_AI_STUIDO_KEY}`,
      {
        method: 'post'
      },
      {
        contents: [
          {
            parts: [
              {
                text: question
              }
            ]
          }
        ]
      }
    ).catch(() => {
      setConnectingAudioServer(() => false)
    })
    setConnectingAudioServer(() => false)
    const answer = result.candidates[0].content.parts[0].text
    // 清空临时问题
    setNewQuestion(() => '')
    // 更新问题答案
    setQuestionList((prev) => {
      console.log(prev)
      console.log(timestamp)
      return [
        ...prev.filter((item) => item.timestamp !== timestamp),
        { timestamp, question, answer }
      ]
    })
  }

  const connectAudioRecongnizorServer = () => {
    setConnectingAudioServer(true)
    const time = new Date().getTime()
    const baseURL = `asr.cloud.tencent.com/asr/v2/${VITE_TENCENT_APPID}?`
    const params = {
      secretid: VITE_TENCENT_SECRETID,
      timestamp: Math.round(time / 1000),
      expired: Math.round(time / 1000) + 24 * 60 * 60,
      nonce: Math.round(time / 100000),
      engine_model_type: VITE_TENCENT_ENGINEMODE,
      voice_id: uuidv4(),
      voice_format: 1,
      filter_modal: 2,
      needvad: 1,
      vad_silence_time: 2000
    }
    const paramsStr = queryString.stringify(params)
    const signature = encodeURI(
      CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(baseURL + paramsStr, VITE_TENCENT_SECRETKEY))
    )
    // 记录最终请求地址
    wsUrl.current = `wss://${baseURL + paramsStr}&signature=${signature}`

    // 连接语音识别服务器
    wsCreate(wsKey, wsUrl.current)
    wsCreatedRegister((res) => {
      if (res.key === wsKey && res.code === 200) {
        // 连接成功
        setConnectingAudioServer(() => false)
      }
    })
    wsReceivedRegister((res) => {
      if (res.key === wsKey) {
        const data = JSON.parse(res.originData)
        console.log('接收到服务器消息 >> :', data)
        switch (data.code) {
          case 0:
            if (data.message_id === undefined) {
              if (!audioCapturerRef.current) {
                createAudioCapturer()
              } else {
                audioCapturerRef.current.start()
              }
              canSendMessage.current = true
            } else {
              if (divRef.current) {
                divRef.current.scrollTop = divRef.current.scrollHeight
              }
              // 接收到消息，将实时语音识别写入新问题中
              setNewQuestion(() => data.result.voice_text_str)
              if (data.result.slice_type === 2) {
                // 一句话结束后开始解答
                const timestamp = new Date().getTime()
                const question = data.result.voice_text_str
                getAnswer(timestamp, question)
              }
            }
            break
          case 4002:
            // 鉴权失败
            if (audioCapturerRef.current) {
              audioCapturerRef.current.stop()
            }
            canSendMessage.current = false
            setIsRecording(() => false)
            break
          case 4007:
            // 编码错误
            console.log(data.message)
            if (audioCapturerRef.current) {
              audioCapturerRef.current.stop()
            }
            canSendMessage.current = false
            setIsRecording(() => false)
            break
        }
      }
    })
    wsClosedRegister((res) => {
      if (res.key === wsKey) {
        console.log('连接关闭')
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        setConnectingAudioServer(() => false)
      }
    })
    wsErrorRegister((res) => {
      if (res.key === wsKey) {
        console.log('连接报错')
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        setConnectingAudioServer(() => false)
      }
    })
  }

  const createAudioCapturer = async () => {
    if (audioCapturerRef.current) {
      return
    }
    // 获取麦克风权限
    await requestMediaAccess('microphone')
    const source = await audioGetSource('microphone')
    if (!source) {
      wsClose(wsKey)
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
    if (!audioCapturerRef.current) {
      wsClose(wsKey)
      return null
    }
    audioCapturerRef.current.start()
  }

  const handleStart = () => {
    if (isRecording) {
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      setIsRecording(false)
      canSendMessage.current = false
      setNewQuestion('')
      wsClose(wsKey)

      wsCreatedRegister(() => {})
      wsReceivedRegister(() => {})
      wsClosedRegister(() => {})
      wsErrorRegister(() => {})
      return
    }
    setIsRecording(true)
    connectAudioRecongnizorServer()
  }

  const handleQuestionClick = (index) => {
    setSelectedQuestionIndex(index)
  }

  useEffect(() => {
    return () => {
      wsCreatedRegister(() => {})
      wsReceivedRegister(() => {})
      wsClosedRegister(() => {})
      wsErrorRegister()
    }
  }, [])

  useEffect(() => {
    setSelectedQuestionIndex(questionList.length - 1)
  }, [questionList])

  const coedBlock = {
    code({ children, className, ...rest }) {
      const match = /language-(\w+)/.exec(className || '')
      return match ? (
        <SyntaxHighlighter
          {...rest}
          showInlineLineNumbers
          PreTag="pre"
          language={match[1]}
          style={oneDark}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code {...rest} className={className}>
          {children}
        </code>
      )
    }
  }

  return (
    <>
      <Topbar />
      <Layout className="bg-zinc-700">
        <Sidebar className="p-2">
          <ForwardQuestionList
            ref={divRef}
            list={questionList}
            newQuestion={newQuestion}
            selected={selectedQuestionIndex}
            onSelect={handleQuestionClick}
          />
        </Sidebar>
        <Content className="p-2 flex flex-col bg-zinc-600">
          <Markdown
            className="p-4 flex-grow-0 h-[calc(100vh-40px-1.5rem)] whitespace-pre-wrap leading-7 overflow-auto"
            remarkPlugins={[remarkGfm]}
            components={coedBlock}
          >
            {questionList[selectedQuestionIndex]?.answer ?? '等待生成答案'}
          </Markdown>
          <Prompt
            handleStart={handleStart}
            handleRegenerate={null}
            isRecording={isRecording}
            connectingAudioServer={connectingAudioServer}
          />
        </Content>
      </Layout>
    </>
  )
}

export default App
