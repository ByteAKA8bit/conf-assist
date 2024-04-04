import queryString from 'query-string'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { useEffect, useReducer, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
  audioGetSource,
} from '@utils'
import { AudioCapturer } from '@utils/audioCapturer'
import { ServerState as ServerStateMap, ModelMap } from '@utils/constant'
import { Layout, Sidebar, Content, Prompt } from '@components'
import { ForwardQuestionList } from '@components/question-list'
import { Topbar } from '@components/topbar'
import { ThemeProvider } from '@provider/theme-provider'

function App() {
  const WebSocketKey = generateWebSocketID()

  function serverStateReducer(state, action) {
    serverStateRef.current = action
    return action
  }
  const serverStateRef = useRef(ServerStateMap.Init)
  const [serverState, serverStateDispatch] = useReducer(serverStateReducer, ServerStateMap.Init)

  const currentModelRef = useRef(ModelMap.Gemini) // 用于解决ws receive 回调读取不到selectedModel的问题
  const [currentModelState, setCurrentModel] = useState(ModelMap.Gemini)

  function questionListReducer(state, action) {
    // 后续从indexedDB增删改查
    questionListRef.current = action
    return action
  }
  const questionListRef = useRef([])
  const [questionList, questionListDispatch] = useReducer(questionListReducer, [])

  const newQuestionRef = useRef('')
  const [newQuestion, setNewQuestion] = useState('')

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0)

  const canSendMessage = useRef(false)

  const divRef = useRef()
  const ASRTimeout = useRef(0)
  const audioCapturerRef = useRef()

  const fetchBaiduAccessToken = async (timestamp) => {
    let access_token = localStorage.baiduAccessToken
    let expires_in = localStorage.baiduAccessTokenExpires
    // token 存在且有效期大于1天 不做处理
    if (access_token && expires_in && Number(expires_in) - timestamp > 24 * 60 * 60 * 1000) {
      return
    }
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    const headers = new Headers()
    headers.append('Model', 'baidu')

    const requestOptions = {
      method: 'POST',
      headers: headers,
      signal: controller.signal,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        `${ModelMap.Baidu.accessTokenUrl}?grant_type=client_credentials&client_id=${import.meta.env.VITE_BAIDU_AI_API_KEY}&client_secret=${import.meta.env.VITE_BAIDU_AI_SECRET_KEY}`,
        requestOptions,
      )
      const result = await response.json()
      localStorage.baiduAccessToken = result.access_token
      localStorage.baiduAccessTokenExpires = timestamp + result.expires_in * 1000
      return result
    } catch (error) {
      console.error('FETCH_BAIDU_ACCESS_TOKEN_FAILED: ', error)
    } finally {
      clearTimeout(timerId)
    }
  }

  function getText(data, index = 0) {
    try {
      const valuePath = currentModelRef.current.valuePath
      if (index < valuePath.length - 1) {
        return getText(data[valuePath[index]], index + 1)
      }
      return data[valuePath[index]]
    } catch (error) {
      console.error(error)
      serverStateDispatch(ServerStateMap.AIFailed)
    }
  }

  const fetchAnswer = async (timestamp, question, regenerate = false) => {
    if (!question) {
      return
    }
    serverStateDispatch(ServerStateMap.AIGenerating)
    if (currentModelRef.current.id === ModelMap.Baidu.id) {
      fetchBaiduAccessToken(timestamp)
    }

    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')
    myHeaders.append('Model', currentModelRef.current.id)
    currentModelRef.current?.headers.forEach(({ key, value }) => {
      myHeaders.append(key, value)
    })

    const raw = currentModelRef.current.createBody(question)

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    }

    const url = `${currentModelRef.current.baseUrl}?${currentModelRef.current.pathName}`

    try {
      const response = await fetch(url, requestOptions)
      if (response.status !== 200) {
        serverStateDispatch(ServerStateMap.AIFailed)
        return
      }
      const reader = response.body.getReader()
      const decodeer = new TextDecoder()
      let answerSnippet = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        const dataStr = decodeer.decode(value)
        const lines = dataStr.split('\n\n')
        const test = /(.|\n)*data:/
        lines.map((line) => {
          if (line.includes('data:')) {
            const data = JSON.parse(line.replace(test, ''))
            answerSnippet += getText(data)

            // 清空临时问题
            newQuestionRef.current = ''
            setNewQuestion('')
            // 流式更新问题答案
            const prev = questionListRef.current
            if (regenerate) {
              const questionItem = prev[selectedQuestionIndex]
              questionItem.answer = answerSnippet
              const before = prev.slice(0, selectedQuestionIndex)
              const after = prev.slice(selectedQuestionIndex + 1)
              questionListDispatch([...before, questionItem, ...after])
            }
            questionListDispatch([
              ...prev.filter((item) => item.timestamp !== timestamp),
              { timestamp, question, answer: answerSnippet },
            ])
          }
        })
      }
    } catch (error) {
      serverStateDispatch(ServerStateMap.AIError)
    }
    serverStateDispatch(ServerStateMap.AIComplete)
  }

  const generateWSURL = (type) => {
    const time = new Date().getTime()
    const timestamp = Math.round(time / 1000)
    if (type === 'tencent') {
      const baseURL = `asr.cloud.tencent.com/asr/v2/${import.meta.env.VITE_TENCENT_APPID}?`
      const params = {
        secretid: import.meta.env.VITE_TENCENT_SECRETID,
        timestamp,
        expired: Math.round(time / 1000) + 24 * 60 * 60,
        nonce: Math.round(time / 100000),
        engine_model_type: import.meta.env.VITE_TENCENT_ENGINEMODE,
        voice_id: uuidv4(),
        voice_format: 1,
        filter_modal: 2,
        needvad: 1,
        vad_silence_time: 2000,
      }
      const paramsStr = queryString.stringify(params)
      const signature = encodeURI(
        CryptoJS.enc.Base64.stringify(
          CryptoJS.HmacSHA1(baseURL + paramsStr, import.meta.env.VITE_TENCENT_SECRETKEY),
        ),
      )
      // 记录最终请求地址
      return `wss://${baseURL + paramsStr}&signature=${signature}`
    } else {
      console.log(import.meta.env)
      // 请求地址根据语种不同变化
      const url = 'wss://rtasr.xfyun.cn/v1/ws'
      const appId = import.meta.env.VITE_XFYUN_APP_ID
      const secretKey = import.meta.env.VITE_XFYUN_APP_KEY
      const signatureMD5 = CryptoJS.MD5(appId + timestamp).toString()
      const signatureSHA1 = CryptoJS.HmacSHA1(signatureMD5, secretKey)
      const signature = encodeURIComponent(CryptoJS.enc.Base64.stringify(signatureSHA1))
      return `${url}?appid=${appId}&ts=${timestamp}&signa=${signature}`
    }
  }

  const handleTencentASRMessage = (data) => {
    switch (data.code) {
      case 0:
        if (data.message_id === undefined) {
          // 握手成功消息，开发发送消息
          canSendMessage.current = true
          serverStateDispatch(ServerStateMap.AudioConnectSuccess)
        } else {
          // 接收到语音转文字消息
          if (divRef.current) {
            divRef.current.scrollTop = divRef.current.scrollHeight
          }
          // 接收到消息，将实时语音识别写入新问题中
          newQuestionRef.current = data.data.result.voice_text_str
          setNewQuestion(() => data.result.voice_text_str)
          if (data.result.slice_type === 2) {
            // 一句话结束后开始解答
            const timestamp = new Date().getTime()
            const question = newQuestionRef.current
            fetchAnswer(timestamp, question)
          }
        }
        break
      case 4002:
        // 鉴权失败
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        serverStateDispatch(ServerStateMap.AudioErrorReTry)
        break
      case 4007:
        // 编码错误
        console.log(data.message)
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        serverStateDispatch(ServerStateMap.AudioErrorReTry)
        break
      default:
        serverStateDispatch(ServerStateMap.AudioError)
        break
    }
  }

  const handleXFASRMessage = (data) => {
    switch (data.action) {
      case 'started':
        canSendMessage.current = true
        serverStateDispatch(ServerStateMap.AudioConnectSuccess)
        break
      case 'result':
        if (divRef.current) {
          divRef.current.scrollTop = divRef.current.scrollHeight
        }
        const content = JSON.parse(data.data)
        if (content) {
          let words = ''
          content.cn.st.rt[0].ws.forEach((item) => {
            if (item.cw[0].wp !== 'p') {
              words += item.cw[0].w
            }
          })

          if (content.cn.st.type === '0') {
            // 已经稳定的句子需要记录并append到显示
            newQuestionRef.current += words
            setNewQuestion(() => newQuestionRef.current)
          } else {
            // 实时替换前面所有的稳定句子和 后续的不稳定句子 此时无需实时更新ref
            setNewQuestion(() => newQuestionRef.current + words)
          }
          // 如果两秒没说话 就开始回答
          if (ASRTimeout.current) {
            clearTimeout(ASRTimeout.current)
          }
          ASRTimeout.current = setTimeout(() => {
            ASRTimeout.current = 0
            const timestamp = new Date().getTime()
            const question = newQuestionRef.current
            fetchAnswer(timestamp, question)
          }, 2000)
        }
        break
      case 'error':
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        serverStateDispatch(ServerStateMap.AudioErrorReTry)
        break
      default:
        serverStateDispatch(ServerStateMap.AudioError)
        break
    }
  }

  const connectAudioRecongnizorServer = (type = 'xf') => {
    serverStateDispatch(ServerStateMap.AudioConnecting)

    // 记录最终请求地址
    const wsUrl = generateWSURL(type)

    // 连接语音识别服务器
    wsCreate(WebSocketKey, wsUrl)

    wsCreatedRegister((res) => {
      if (res.key === WebSocketKey && res.code === 200) {
        // 此时还不能发送消息
        canSendMessage.current = false
        // 开始录音
        if (!audioCapturerRef.current) {
          createAudioCapturer()
        } else {
          audioCapturerRef.current.start()
        }
        // 创建成功
        serverStateDispatch(ServerStateMap.AudioConnecting)
      }
    })
    wsReceivedRegister((res) => {
      if (res.key === WebSocketKey) {
        const data = JSON.parse(res.originData)
        // console.log('接收到服务器消息 >> :', data)
        // 使用腾讯ASR
        // handleTencentASRMessage(data)
        // 使用讯飞ASR
        switch (type) {
          case 'tencent':
            handleTencentASRMessage(data)
            break
          case 'xf':
            handleXFASRMessage(data)
        }
      }
    })
    wsClosedRegister((res) => {
      if (res.key === WebSocketKey) {
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        if (serverStateRef.current.reTry) {
          serverStateDispatch(ServerStateMap.AudioErrorReTry)
        } else {
          serverStateDispatch(ServerStateMap.Init)
        }
      }
    })
    wsErrorRegister((res) => {
      if (res.key === WebSocketKey) {
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        serverStateDispatch(ServerStateMap.AudioError)
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
      wsClose(WebSocketKey)
      return
    }
    audioCapturerRef.current = new AudioCapturer(
      source,
      (data) => {
        if (canSendMessage.current && data) {
          wsSend(WebSocketKey, data)
        }
      },
      () => {
        canSendMessage.current = false
      },
      () => {
        canSendMessage.current = false
      },
    )
    if (!audioCapturerRef.current) {
      wsClose(WebSocketKey)
      return null
    }
    audioCapturerRef.current.start()
  }

  const handleStart = () => {
    // 不为初始值或者不为重试
    if (
      serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode &&
      serverStateRef.current.stateCode !== ServerStateMap.AudioErrorReTry.stateCode
    ) {
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      canSendMessage.current = false
      newQuestionRef.current = ''
      setNewQuestion('')
      serverStateDispatch(ServerStateMap.Init)
      wsClose(WebSocketKey)
      wsCreatedRegister(() => {})
      wsReceivedRegister(() => {})
      wsClosedRegister(() => {})
      wsErrorRegister(() => {})
      return
    }
    connectAudioRecongnizorServer()
  }

  const handleRegenerate = () => {
    const selectedQuestion = questionList[selectedQuestionIndex]
    if (selectedQuestion) {
      fetchAnswer(selectedQuestion.timestamp, selectedQuestion.question, true)
    } else {
      if (newQuestionRef.current !== '') {
        fetchAnswer(new Date().getTime(), newQuestionRef.current)
      }
    }
  }

  const handleQuestionClick = (index) => {
    setSelectedQuestionIndex(index)
    if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    } else {
      serverStateDispatch(serverStateRef.current)
    }
  }

  const handleModelChange = (model) => {
    setCurrentModel(model)
    currentModelRef.current = model
  }

  useEffect(() => {
    setSelectedQuestionIndex(questionList.length - 1)
  }, [questionList.length])

  const coedBlock = {
    code({ children, className, ...rest }) {
      const match = /language-(\w+)/.exec(className || '')
      return match ? (
        <SyntaxHighlighter {...rest} showInlineLineNumbers language={match[1]} style={oneDark}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code {...rest} className={className}>
          {children}
        </code>
      )
    },
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Topbar selectedModel={currentModelState} onModelChange={handleModelChange} />
      <Layout className="bg-primary dark:bg-zinc-700">
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
            className="p-4 pb-4 mt-4 rounded flex-grow-0 h-[calc(100vh-5rem)] select-text leading-7 overflow-auto"
            remarkPlugins={[remarkGfm]}
            components={coedBlock}
          >
            {questionList[selectedQuestionIndex]?.answer
              ? questionList[selectedQuestionIndex].answer
              : questionList[selectedQuestionIndex] === undefined
                ? ''
                : '等待生成答案'}
          </Markdown>
          <Prompt start={handleStart} reGenerate={handleRegenerate} serverState={serverState} />
        </Content>
      </Layout>
    </ThemeProvider>
  )
}

export default App
