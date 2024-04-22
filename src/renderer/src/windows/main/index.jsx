import { useReducer, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { requestMediaAccess, audioGetSource, getMachineID } from '@utils'
import { AudioCapturer } from '@utils/audioCapturer'
import { ServerStateMap, CorsProxyBaseUrl, ActiveBaseUrl, ModelMap } from '@utils/constant'
import { Layout, Sidebar, Content } from '@components/layout'
import { QuestionList } from '@windows/main/components/question-list'
import { Topbar } from '@windows/main/components/topbar'
import { toast } from '@/components/ui/use-toast'
import { useDialog } from '@/hooks/use-dialog'
import ChoseWindowDialog from './components/chose-window'
import { getDB } from '@/utils/indexedDB'
import { ActionButton } from '@windows/main/components/action-button'
import { HistoryQuestions } from './components/history-questions'
import { ScrollArea } from '@/components/ui/scroll-area'
import getToken from '@/utils/aliyunASRAccessToken'
import { generateRandomString } from '@/utils'

function MainWindow() {
  const db = getDB()
  const ASRWebSocket = useRef(null)

  // 回答请求控制
  const fetchAnswerController = new AbortController()

  // 全局弹窗
  const { openDialog } = useDialog()

  // 选择监听弹窗
  const [choseWindowOpen, setChoseWindowOpen] = useState(false)
  // 全部打开的应用程序
  const [allWindow, setAllWindow] = useState([])
  const chosedWindow = useRef(null)
  // 用于控制更新可用时间
  const timeCounter = useRef(0)
  // 服务器状态
  function serverStateReducer(state, action) {
    serverStateRef.current = action
    return action
  }
  const serverStateRef = useRef(ServerStateMap.Init)
  const [serverState, serverStateDispatch] = useReducer(serverStateReducer, ServerStateMap.Init)
  // 当前使用的模型
  const currentModelRef = useRef(ModelMap.Aliyun)
  // 记录问题
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
  // 当前新问题
  const newQuestionRef = useRef('')
  const [newQuestion, setNewQuestion] = useState('')
  // 选中的问题
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  // 选中的历史记录
  const [selectedHistory, setSelectedHistory] = useState(null)

  // 是否能够发送语音到识别服务器
  const canSendMessageSignal = useRef(false)

  // 语音识别实例
  const audioCapturerRef = useRef()

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
      // 有新问题开始生成时，将选中的历史清除
      setSelectedHistory(null)
      setSelectedQuestion(() => ({ timestamp, question, answer: '' }))
    }

    serverStateDispatch(ServerStateMap.AIGenerating)

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
            const question = questionListRef.current[currentIndex]
            question.answer = answerSnippet
            const before = questionListRef.current.slice(0, currentIndex)
            const after = questionListRef.current.slice(currentIndex + 1)
            // 更新一条数据
            questionListDispatch({
              type: 'update',
              payload: [...before, question, ...after],
              updateItem: question,
            })
            setSelectedQuestion(() => question)
          }
        })
      }
    } catch (error) {
      if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
        serverStateDispatch(ServerStateMap.AIError)
      }
      return
    }
    // 如果不是正常生成状态
    if (serverStateRef.current.stateCode === ServerStateMap.AIGenerating.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
  }

  const generateWSURL = async () => {
    const token = await getToken(
      import.meta.env.VITE_ALIYUN_AK_ID,
      import.meta.env.VITE_ALIYUN_AK_Secret,
    )
    const url = 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1'
    return `${url}?token=${token}`
  }

  const handleASRMessage = (data) => {
    switch (data.header.name) {
      case 'TranscriptionStarted':
        canSendMessageSignal.current = true
        serverStateDispatch(ServerStateMap.AudioConnectSuccess)
        break
      case 'TranscriptionResultChanged':
        newQuestionRef.current = data.payload.result
        setNewQuestion(() => newQuestionRef.current)
        break
      case 'SentenceEnd':
        newQuestionRef.current = data.payload.result
        setNewQuestion(() => newQuestionRef.current)
        const timestamp = new Date().getTime()
        const question = newQuestionRef.current
        fetchAnswer(timestamp, question)
        break
    }
  }

  const connectAudioRecongnizorServer = async () => {
    serverStateDispatch(ServerStateMap.AudioConnecting)
    const wsUrl = await generateWSURL()

    ASRWebSocket.current = new WebSocket(wsUrl)
    ASRWebSocket.current.onopen = () => {
      canSendMessageSignal.current = false
      // 开始录音
      if (!audioCapturerRef.current) {
        createAudioCapturer()
      } else {
        audioCapturerRef.current.start()
      }
      // 发送开始转换指令
      ASRWebSocket.current.send(
        JSON.stringify({
          header: {
            message_id: generateRandomString(32),
            task_id: generateRandomString(32),
            namespace: 'SpeechTranscriber',
            name: 'StartTranscription',
            appkey: import.meta.env.VITE_ALIYUN_ASR_KEY,
          },
          payload: {
            format: 'pcm',
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
            // enable_semantic_sentence_detection: true,
            max_sentence_silence: 1500,
            enable_words: true,
            disfluency: true,
          },
        }),
      )

      // 创建成功
      serverStateDispatch(ServerStateMap.AudioConnecting)
    }
    ASRWebSocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleASRMessage(data)
    }
    ASRWebSocket.current.onclose = () => {
      canSendMessageSignal.current = false
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      // 不可重试则关闭
      if (!serverStateRef.current.reTry) {
        serverStateDispatch(ServerStateMap.Init)
      }
    }
    ASRWebSocket.current.onerror = () => {
      canSendMessageSignal.current = false
      if (audioCapturerRef.current) {
        audioCapturerRef.current.stop()
      }
      serverStateDispatch(ServerStateMap.AudioError)
    }
  }

  const createAudioCapturer = async () => {
    if (audioCapturerRef.current) {
      return
    }

    if (!chosedWindow.current) {
      if (timeCounter.current) {
        clearInterval(timeCounter.current)
      }
      ASRWebSocket.current.close()
      return
    }
    audioCapturerRef.current = new AudioCapturer(
      chosedWindow.current,
      (data) => {
        if (canSendMessageSignal.current && data) {
          ASRWebSocket.current.send(data)
        }
      },
      () => {
        canSendMessageSignal.current = false
      },
      () => {
        canSendMessageSignal.current = false
      },
    )
    if (!audioCapturerRef.current) {
      if (timeCounter.current) {
        clearInterval(timeCounter.current)
      }
      ASRWebSocket.current.close()
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
      canSendMessageSignal.current = false
      newQuestionRef.current = ''
      setNewQuestion('')
      fetchAnswerController.abort()
      ASRWebSocket.current.close()
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

    const result = await requestMediaAccess('microphone')
    if (result === 'BlackHole_NOT_INSTALL') {
      toast({
        title: '请先安装BlackHole',
        duration: 3000,
        className:
          'bg-rose-400/90 fixed top-10 right-4 w-1/4 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
      })
      return
    }
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
        const question = questionList.filter((item) => item.timestamp === selectedQuestion)?.[0]
        if (question) {
          fetchAnswer(question.timestamp, question.question, true)
        }
        break
    }
  }

  const handleQuestionClick = (id) => {
    if (serverStateRef.current.stateCode === ServerStateMap.AIGenerating.stateCode) {
      return
    }
    setSelectedHistory(null)
    setSelectedQuestion(questionList.find((item) => item.timestamp === id))
    if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
  }

  const handleHistorySelect = (quesiton) => {
    // 生成状态下不可点击？
    if (serverStateRef.current.stateCode === ServerStateMap.AIGenerating.stateCode) {
      return
    }
    setSelectedQuestion(null)
    setSelectedHistory(quesiton)
    if (serverStateRef.current.stateCode !== ServerStateMap.Init.stateCode) {
      serverStateDispatch(ServerStateMap.AIComplete)
    }
  }

  const updateActiveTimeleft = async () => {
    const controller = new AbortController()
    if (!localStorage.machineID) {
      localStorage.machineID = await getMachineID()
    }
    const timerId = setTimeout(() => controller.abort(), 5000)
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')

    const raw = JSON.stringify({
      machineID: localStorage.machineID,
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
        if (result.code === 400 && result?.data?.timeleft) {
          // 本地时间比服务器的长, 重置本地时间
          if (localStorage.activeTimeleft > result.data.timeleft) {
            localStorage.activeTimeleft = result.data.timeleft
          }
          if (result.data.timeleft <= 0) {
            localStorage.activeTimeleft = timeleft
            localStorage.actived = 0
            setTimeout(() => {
              openDialog('active')
            }, 1000)
          }
          return
        } else {
          throw new Error('更新剩余时间失败')
        }
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
    const timerId = setTimeout(() => controller.abort(), 5000)
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
        if (result.code === 400 && result?.data?.timeleft) {
          // 本地时间比服务器的长,重置本地时间
          if (localStorage.freeTrialTimeleft > result.data.timeleft) {
            localStorage.freeTrialTimeleft = result.data.timeleft
          }
          if (result.data.timeleft <= 0) {
            localStorage.freeTrial = 'expired'
            localStorage.freeTrialTimeleft = 0
            setTimeout(() => {
              openDialog('activeCode')
            }, 1000)
          }
          return
        } else {
          throw new Error('更新试用时间失败')
        }
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
        <Sidebar>
          {/* 问题更新时，选中问题，清除历史的选中状态 */}
          <ScrollArea>
            <QuestionList
              list={questionList}
              newQuestion={newQuestion}
              selected={selectedQuestion}
              onSelect={handleQuestionClick}
            />
            <HistoryQuestions selected={selectedHistory} onSelect={handleHistorySelect} />
          </ScrollArea>
        </Sidebar>
        <Content className="p-2 flex flex-col bg-zinc-100 dark:bg-zinc-600">
          <Markdown
            className="p-4 pb-4 mt-8 rounded flex-grow-0 h-[calc(100vh-6rem)] select-text leading-7 overflow-auto"
            remarkPlugins={[remarkGfm]}
            components={customComponents}
          >
            {selectedQuestion?.answer || selectedHistory?.answer}
          </Markdown>
          <ActionButton
            start={handleStart}
            reGenerate={handleRegenerate}
            serverState={serverState}
          />
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
