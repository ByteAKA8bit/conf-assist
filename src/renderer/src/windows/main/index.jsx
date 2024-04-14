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
  wsOnOpenRegister,
  wsOnMessageRegister,
  wsOnCloseRegister,
  wsOnErrorRegister,
  generateWebSocketID,
  requestMediaAccess,
  audioGetSource,
  getMachineID,
} from '@utils'
import { AudioCapturer } from '@utils/audioCapturer'
import { ServerStateMap, ModelMap, CorsProxyBaseUrl, ActiveBaseUrl } from '@utils/constant'
import { Layout, Sidebar, Content } from '@components/layout'
import { Prompt } from '@windows/main/components/prompt'
import { QuestionList } from '@windows/main/components/question-list'
import { Topbar } from '@windows/main/components/topbar'
import { useSpeechSupplier } from '@/hooks/use-speech-suplier'
import { useModel } from '@/hooks/use-model'
import { toast } from '@/components/ui/use-toast'
import { useDialog } from '@/hooks/use-dialog'
import ChoseWindowDialog from './components/chose-window'
import { getDB } from '@/utils/indexedDB'

function MainWindow() {
  const WebSocketKey = generateWebSocketID()
  const db = getDB()

  const supplier = useSpeechSupplier((state) => state.supplier)
  const model = useModel((state) => state.model)

  const fetchAnswerController = new AbortController()

  const { openDialog } = useDialog()
  const [choseWindowOpen, setChoseWindowOpen] = useState(false)
  const [allWindow, setAllWindow] = useState([])
  const chosedWindow = useRef(null)

  const timeCounter = useRef(0)

  function serverStateReducer(state, action) {
    serverStateRef.current = action
    return action
  }
  const serverStateRef = useRef(ServerStateMap.Init)
  const [serverState, serverStateDispatch] = useReducer(serverStateReducer, ServerStateMap.Init)

  const currentModelRef = useRef()

  function questionListReducer(state, action) {
    // 后续从indexedDB增删改查

    const { type, payload } = action
    switch (type) {
      case 'insert':
        // 取最后一条数据，push
        db.open([{ name: 'quesiton', keyPath: 'timestamp' }]).then(() => {
          db.put('question', payload[payload.length - 1]).then(() => {
            db.close()
          })
        })
        break
      case 'update':
        db.open([{ name: 'quesiton', keyPath: 'timestamp' }]).then(() => {
          db.put('question', action.updateItem).then(() => {
            db.close()
          })
        })
        break
    }
    questionListRef.current = action.payload
    return action.payload
  }
  const questionListRef = useRef([])
  const [questionList, questionListDispatch] = useReducer(questionListReducer, [])

  const newQuestionRef = useRef('')
  const [newQuestion, setNewQuestion] = useState('')

  const [selectedQuestionID, setSelectedQuestionID] = useState(0)

  const canSendMessageRef = useRef(false)

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

    setNewQuestion(() => '')
    newQuestionRef.current = ''

    if (!regenerate) {
      // 插入一条新的数据
      questionListDispatch({
        type: 'insert',
        payload: [
          ...questionListRef.current.filter((item) => item.timestamp !== timestamp),
          { timestamp, question, answer: '' },
        ],
      })
      setSelectedQuestionID(() => timestamp)
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
            // 流式更新问题答案
            const currentIndex = questionListRef.current.findIndex(
              (item) => item.timestamp === timestamp,
            )
            if (currentIndex === -1) {
              return
            }
            const questionItem = questionListRef.current[currentIndex]
            questionItem.answer = answerSnippet
            const before = questionListRef.current.slice(0, currentIndex)
            const after = questionListRef.current.slice(currentIndex + 1)
            // 更新一条数据
            questionListDispatch({
              type: 'update',
              payload: [...before, questionItem, ...after],
              updateItem: questionItem,
            })
          }
        })
      }
    } catch (error) {
      console.error(error)
      serverStateDispatch(ServerStateMap.AIError)
      return
    }
    // 如果不是正常生成状态
    if (serverStateRef.current.stateCode === ServerStateMap.AIGenerating.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
  }

  const generateWSURL = () => {
    const time = new Date().getTime()
    const timestamp = Math.round(time / 1000)
    if (supplier === 'tencent') {
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
          canSendMessageRef.current = true
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
        canSendMessageRef.current = false
        serverStateDispatch(ServerStateMap.AudioErrorReTry)
        wsClose(WebSocketKey)
        setTimeout(() => {
          connectAudioRecongnizorServer()
        }, 500)
        break
      case 4007:
        // 编码错误
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessageRef.current = false
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
        canSendMessageRef.current = true
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
        canSendMessageRef.current = false
        serverStateDispatch(ServerStateMap.AudioErrorReTry)
        break
      default:
        serverStateDispatch(ServerStateMap.AudioError)
        break
    }
  }

  const connectAudioRecongnizorServer = () => {
    serverStateDispatch(ServerStateMap.AudioConnecting)

    // 记录最终请求地址
    const wsUrl = generateWSURL()

    // 连接语音识别服务器
    wsCreate(WebSocketKey, wsUrl)

    // 注册onOpen事件
    wsOnOpenRegister((res) => {
      if (res.key === WebSocketKey && res.code === 200) {
        // 此时还不能发送消息
        canSendMessageRef.current = false
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
    wsOnMessageRegister((res) => {
      if (res.key === WebSocketKey) {
        const data = JSON.parse(res.originData)
        // console.log('接收到服务器消息 >> :', data)
        // 使用腾讯ASR
        // handleTencentASRMessage(data)
        // 使用讯飞ASR
        switch (supplier) {
          case 'tencent':
            handleTencentASRMessage(data)
            break
          case 'xunfei':
            handleXFASRMessage(data)
            break
          default:
            handleXFASRMessage(data)
        }
      }
    })
    wsOnCloseRegister((res) => {
      if (res.key === WebSocketKey) {
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessageRef.current = false
        // 不可重试则关闭
        if (!serverStateRef.current.reTry) {
          serverStateDispatch(ServerStateMap.Init)
        }
      }
    })
    wsOnErrorRegister((res) => {
      if (res.key === WebSocketKey) {
        if (audioCapturerRef.current) {
          audioCapturerRef.current.stop()
        }
        canSendMessageRef.current = false
        serverStateDispatch(ServerStateMap.AudioError)
      }
    })
  }

  const createAudioCapturer = async () => {
    if (audioCapturerRef.current) {
      return
    }

    if (!chosedWindow.current) {
      if (timeCounter.current) {
        clearInterval(timeCounter.current)
      }
      wsClose(WebSocketKey)
      return
    }
    audioCapturerRef.current = new AudioCapturer(
      chosedWindow.current,
      (data) => {
        if (canSendMessageRef.current && data) {
          wsSend(WebSocketKey, data)
        }
      },
      () => {
        canSendMessageRef.current = false
      },
      () => {
        canSendMessageRef.current = false
      },
    )
    if (!audioCapturerRef.current) {
      if (timeCounter.current) {
        clearInterval(timeCounter.current)
      }
      wsClose(WebSocketKey)
      return null
    }
    audioCapturerRef.current.start()
  }

  const handleStart = async () => {
    // 不为初始值或者不为重试
    if (
      serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode &&
      serverStateRef.current.stateCode !== ServerStateMap.AudioErrorReTry.stateCode
    ) {
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      canSendMessageRef.current = false
      newQuestionRef.current = ''
      setNewQuestion('')
      fetchAnswerController.abort()
      wsClose(WebSocketKey)
      serverStateDispatch(ServerStateMap.Init)

      if (timeCounter.current) {
        clearInterval(timeCounter.current)
      }

      if (localStorage.freeTrial && localStorage.freeTrial !== 'expired') {
        updateFreeTrial()
      }
      if (localStorage.actived) {
        updateActiveTimeleft()
      }

      return
    }

    // 未点击试用,打开试用窗口
    if (localStorage.freeTrial === undefined) {
      toast({
        title: '请点击开始试用',
        duration: 1500,
        className:
          'bg-orange-400/90 fixed top-10 right-4 w-1/4 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
      })
      setTimeout(() => {
        openDialog('freeTrial')
      }, 500)
      return
    }

    // 试用过期，无激活
    if (localStorage.freeTrial === 'expired' && localStorage.actived !== '1') {
      toast({
        title: '未激活，无试用权限',
        duration: 1500,
        className:
          'bg-rose-400/90 fixed top-10 right-4 w-1/4 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
      })
      return
    }

    await requestMediaAccess('microphone')
    await requestMediaAccess('screen')
    const sources = await audioGetSource()
    setAllWindow(sources)
    setChoseWindowOpen(true)
  }

  const handleConfirm = async (source) => {
    setChoseWindowOpen(false)
    // 确认窗口了，可以开始
    chosedWindow.current = source

    // 开始前更新一次
    if (localStorage.freeTrial && localStorage.freeTrial !== 'expired') {
      updateFreeTrial()
    }
    if (localStorage.actived) {
      updateActiveTimeleft()
    }

    // 有试用，无激活
    if (localStorage.freeTrial !== 'expired' && localStorage.freeTrialTimeleft !== undefined) {
      // 算剩余时间
      timeCounter.current = setInterval(() => {
        const freeTrialTimeleft = Number(localStorage.freeTrialTimeleft)
        if (freeTrialTimeleft <= 0) {
          // 试用结束
          localStorage.freeTrial = 'expired'
          localStorage.freeTrialTimeleft = 0
          clearInterval(timeCounter.current)
          toast({
            title: '试用结束',
            duration: 1500,
            className:
              'bg-orange-400/90 fixed top-10 right-4 w-1/4 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
          })
          handleStart()
          setTimeout(() => {
            openDialog('freeTrial')
          }, 1500)
        } else {
          localStorage.freeTrialTimeleft = freeTrialTimeleft - 1000
          // 每分钟更新一次
          if (freeTrialTimeleft % 60000 === 0) {
            updateFreeTrial()
          }
        }
      }, 1000)
    }

    // 有激活
    if (localStorage.actived && localStorage.activeTimeleft) {
      // 算剩余时间
      timeCounter.current = setInterval(() => {
        const activeTimeleft = Number(localStorage.activeTimeleft)
        if (activeTimeleft <= 0) {
          localStorage.actived = 0
          localStorage.activeTimeleft = 0
          clearInterval(timeCounter.current)
        } else {
          localStorage.activeTimeleft = activeTimeleft - 1000
          if (activeTimeleft % 60000 === 0) {
            updateActiveTimeleft()
          }
        }
      }, 1000)
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
      case ServerStateMap.AIComplete:
      case ServerStateMap.AIFailed:
        const selectedQuestion = questionList.filter(
          (item) => item.timestamp === selectedQuestionID,
        )?.[0]
        if (selectedQuestion) {
          fetchAnswer(selectedQuestion.timestamp, selectedQuestion.question, true)
        }
        break
    }
  }

  const handleQuestionClick = (id) => {
    setSelectedQuestionID(id)
    if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
  }

  const updateActiveTimeleft = async () => {
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')

    const raw = JSON.stringify({
      id: localStorage.activeID,
      timeleft: Number(localStorage.activeTimeleft),
    })

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      signal: controller.signal,
      redirect: 'follow',
    }

    try {
      const response = await fetch(`${ActiveBaseUrl}/update-active-timeleft`, requestOptions)
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error('更新剩余时间失败')
      }
      const { timeleft } = result.data
      localStorage.activeTimeleft = timeleft
      if (Number(timeleft) <= 0) {
        localStorage.actived = 0
        setTimeout(() => {
          openDialog('active')
        }, 1000)
      }
    } catch (error) {
      console.error(error)
    } finally {
      clearTimeout(timerId)
    }
  }

  const updateFreeTrial = async () => {
    if (!localStorage.machineID) {
      localStorage.machineID = await getMachineID()
    }
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')

    const raw = JSON.stringify({
      machineID: localStorage.machineID,
      timeleft: Number(localStorage.freeTrialTimeleft),
    })

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      signal: controller.signal,
      redirect: 'follow',
    }

    try {
      const response = await fetch(`${ActiveBaseUrl}/update-free-trial`, requestOptions)
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error('更新试用时间失败')
      }
      const { expired, timeleft } = result.data
      if (expired) {
        localStorage.freeTrial = 'expired'
        localStorage.freeTrialTimeleft = 0
        setTimeout(() => {
          openDialog('activeCode')
        }, 1000)
      } else {
        localStorage.freeTrialTimeleft = timeleft
      }
    } catch (error) {
      console.error(error)
    } finally {
      clearTimeout(timerId)
    }
  }

  useEffect(() => {
    if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      canSendMessageRef.current = false
      serverStateDispatch(ServerStateMap.Init)
      wsClose(WebSocketKey)
      setTimeout(() => {
        connectAudioRecongnizorServer()
      }, 500)
    }
  }, [supplier])

  useEffect(() => {
    switch (model) {
      case ModelMap.Gemini.id:
        currentModelRef.current = ModelMap.Gemini
        break
      case ModelMap.Aliyun.id:
        currentModelRef.current = ModelMap.Aliyun
        break
      case ModelMap.Baidu.id:
        currentModelRef.current = ModelMap.Baidu
        break
    }
  }, [model])

  const customComponents = {
    code({ children, className, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return match ? (
        <SyntaxHighlighter {...props} showInlineLineNumbers language={match[1]} style={oneDark}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code {...props} className={className}>
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
            selected={selectedQuestionID}
            onSelect={handleQuestionClick}
          />
          {/* 这里加上HistoryList 内部自动加载历史记录 传出历史记录点击事件 */}
        </Sidebar>
        <Content className="p-2 flex flex-col bg-zinc-100 dark:bg-zinc-600">
          <Markdown
            className="p-4 pb-4 mt-8 rounded flex-grow-0 h-[calc(100vh-6rem)] select-text leading-7 overflow-auto"
            remarkPlugins={[remarkGfm]}
            components={customComponents}
          >
            {questionList.filter((item) => item.timestamp === selectedQuestionID)?.[0]?.answer ||
              ''}
          </Markdown>
          <Prompt start={handleStart} reGenerate={handleRegenerate} serverState={serverState} />
          <ChoseWindowDialog
            open={choseWindowOpen}
            setOpen={setChoseWindowOpen}
            sources={allWindow}
            onConfirm={handleConfirm}
          />
        </Content>
      </Layout>
    </>
  )
}

export default MainWindow
