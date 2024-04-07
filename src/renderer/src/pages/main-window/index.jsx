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
import { ServerStateMap, ModelMap, CorsProxyBaseUrl } from '@utils/constant'
import { Layout, Sidebar, Content } from '@components/layout'
import { Prompt } from '@/pages/main-window/components/prompt'
import { QuestionList } from '@/pages/main-window/components/question-list'
import { Topbar } from '@/pages/main-window/components/topbar'

function MainWindow() {
  const WebSocketKey = generateWebSocketID()

  const fetchAnswerController = new AbortController()

  function serverStateReducer(state, action) {
    serverStateRef.current = action
    return action
  }
  const serverStateRef = useRef(ServerStateMap.Init)
  const [serverState, serverStateDispatch] = useReducer(serverStateReducer, ServerStateMap.Init)

  const currentModelRef = useRef(ModelMap.Aliyun)

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

    const requestOptions = {
      method: 'POST',
      headers: headers,
      signal: controller.signal,
      redirect: 'follow',
    }

    const url = `${CorsProxyBaseUrl}${ModelMap.Baidu.accessTokenPathName}&hostname=${ModelMap.Baidu.hostname}`

    try {
      const response = await fetch(url, requestOptions)
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
      console.error('GET_TEXT_ERROR: ', error)
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
    currentModelRef.current?.headers.forEach(({ key, value }) => {
      myHeaders.append(key, value)
    })

    const raw = currentModelRef.current.createBody(question)

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      signal: fetchAnswerController.signal,
      redirect: 'follow',
    }

    const url = `${CorsProxyBaseUrl}${currentModelRef.current.pathName}&hostname=${currentModelRef.current.hostname}`

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
        // 当阅读结束或者用户主动停止时
        if (done || serverStateRef.current.stateCode !== ServerStateMap.AIGenerating.stateCode) {
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
      return
    }
    // 如果不是正常生成状态
    if (serverStateRef.current.stateCode === ServerStateMap.AIGenerating.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
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
        vad_silence_time: 1500,
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
          newQuestionRef.current = data.result.voice_text_str
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
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessage.current = false
        setTimeout(() => {
          connectAudioRecongnizorServer()
        }, 500)
        break
      case 4007:
        // 编码错误
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
            } else {
              words += ' '
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
          }, 1500)
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

  const connectAudioRecongnizorServer = (type = 'tencent') => {
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
        // 不可重试则关闭
        if (!serverStateRef.current.reTry) {
          serverStateDispatch(ServerStateMap.Init)
        }
        // 可重试不更改状态
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
      fetchAnswerController.abort()
      wsClose(WebSocketKey)
      serverStateDispatch(ServerStateMap.Init)
      return
    }
    connectAudioRecongnizorServer()
  }

  const handleRegenerate = () => {
    switch (serverStateRef.current) {
      case ServerStateMap.Init:
        return
      case ServerStateMap.AIGenerating:
        fetchAnswerController.abort()
        serverStateDispatch(ServerStateMap.AIComplete)
        return
      case ServerStateMap.AIFailed:
        const selectedQuestion = questionList[selectedQuestionIndex]
        if (selectedQuestion) {
          fetchAnswer(selectedQuestion.timestamp, selectedQuestion.question, true)
        } else {
          if (newQuestionRef.current !== '') {
            fetchAnswer(new Date().getTime(), newQuestionRef.current)
          }
        }
        break
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
    <>
      <Topbar />
      <Layout className="bg-white dark:bg-zinc-700">
        <Sidebar className="p-2">
          <QuestionList
            list={questionList}
            newQuestion={newQuestion}
            selected={selectedQuestionIndex}
            onSelect={handleQuestionClick}
          />
        </Sidebar>
        <Content className="p-2 flex flex-col bg-zinc-100 dark:bg-zinc-600">
          <Markdown
            className="p-4 pb-4 mt-8 rounded flex-grow-0 h-[calc(100vh-6rem)] select-text leading-7 overflow-auto"
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
    </>
  )
}

export default MainWindow
