import { useEffect, useState } from 'react'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { LuXCircle, LuMinusCircle, LuMaximize, LuMinimize2 } from 'react-icons/lu'

import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'

import { openExternal } from '@/utils'
import { useTheme } from '@/provider/theme-provider'
import { useDialog } from '@/hooks/use-dialog'
import { useSpeechSupplier } from '@/hooks/use-speech-suplier'
import { useModel } from '@/hooks/use-model'
import { ModelMap } from '@/utils/constant'
import { toast } from '@/components/ui/use-toast'
import { getDB } from '@/utils/indexedDB'

export const Topbar = () => {
  const [maxmized, setMaxmized] = useState(false)
  const [questions, setQuestions] = useState({})
  const { supplier, setSupplier } = useSpeechSupplier()
  const { model, setModel } = useModel()

  const { setTheme } = useTheme()
  const { openDialog } = useDialog()

  const closeWindow = window.electron.close
  const minimizeWindow = window.electron.minimize
  const maxmizeWindow = () => {
    setMaxmized((max) => !max)
    window.electron.maxmize()
  }

  useEffect(() => {
    if (localStorage.freeTrial === undefined) {
      openDialog('freeTrial')
    }

    const db = getDB()

    db.open([{ name: 'question', keyPath: 'timestamp' }]).then(() => {
      const current = new Date().getTime()
      const oneYearAgo = current - 365 * 24 * 60 * 60 * 1000
      const range = IDBKeyRange.bound(oneYearAgo, current)
      db.query('question', '', range).then((res) => {
        // 年月日
        // 定义一个空对象来存储转换后的数据
        const transformedData = {}

        // 遍历 dataList
        res.forEach((item) => {
          item.timestamp
          const date = new Date(item.timestamp)
          const year = date.getFullYear()
          const month = date.getMonth() + 1 // 月份从0开始，所以要加1
          const day = date.getDate()

          if (!transformedData[`${year}年${month}月`]) {
            transformedData[`${year}年${month}月`] = {}
          }

          if (!transformedData[`${year}年${month}月`][`${day}日`]) {
            transformedData[`${year}年${month}月`][`${day}日`] = []
          }

          // 将时间戳、问题和答案放入对应的日期数组中
          transformedData[`${year}年${month}月`][`${day}日`].push(item)
        })
        setQuestions(transformedData)
        db.close()
      })
    })
  }, [])

  return (
    <div className="absolute h-10 w-full border-b-[1px] bg-white flex justify-start items-center dark:bg-zinc-700 dark:border-zinc-800/50">
      <header className="w-[calc(100vw-80px)] h-full flex justify-start items-center pl-2 inset-0 bg-transparent">
        <img className="w-5 h-5 mr-1" src="./images/icon.svg" alt="conf-assist" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="focus-visible:ring-0 focus-visible:ring-offset-0 h-7"
            >
              设置
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="dark:bg-zinc-600 min-w-24" align="start">
            <DropdownMenuItem className="hidden">语音识别热词</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog('promptManage')}>
              预设提示词
            </DropdownMenuItem>
            {/* <DropdownMenuSub>
              <DropdownMenuSubTrigger>语音识别引擎</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="dark:bg-zinc-600 min-w-24">
                  <DropdownMenuCheckboxItem
                    checked={supplier === 'tencent'}
                    onCheckedChange={() => {
                      toast({
                        description: `语音引擎切换为：腾讯语音识别`,
                        duration: 1500,
                        className:
                          'bg-green-400/90 fixed top-10 right-4 w-[16rem] text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
                      })
                      setSupplier('tencent')
                    }}
                  >
                    腾讯
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={supplier === 'xunfei'}
                    onCheckedChange={() => {
                      toast({
                        title: `语音引擎切换为：讯飞语音识别`,
                        duration: 1500,
                        className:
                          'bg-green-400/90 fixed top-10 right-4 w-[16rem] text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
                      })
                      setSupplier('xunfei')
                    }}
                  >
                    讯飞
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>文本生成模型</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="dark:bg-zinc-600 min-w-24">
                  <DropdownMenuCheckboxItem
                    checked={model === ModelMap.Gemini.id}
                    onCheckedChange={() => {
                      toast({
                        title: `模型切换为：${ModelMap.Gemini.name}`,
                        duration: 1500,
                        className:
                          'bg-green-400/90 fixed top-10 right-4 w-[14rem] text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
                      })
                      setModel(ModelMap.Gemini.id)
                    }}
                  >
                    {ModelMap.Gemini.name}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={model === ModelMap.Aliyun.id}
                    onCheckedChange={() => {
                      toast({
                        title: `模型切换为：${ModelMap.Aliyun.name}`,
                        duration: 1500,
                        className:
                          'bg-green-400/90 fixed top-10 right-4 w-[14rem] text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
                      })
                      setModel(ModelMap.Aliyun.id)
                    }}
                  >
                    {ModelMap.Aliyun.name}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={model === ModelMap.Baidu.id}
                    onCheckedChange={() => {
                      toast({
                        title: `模型切换为：${ModelMap.Baidu.name}`,
                        duration: 1500,
                        className:
                          'bg-green-400/90 fixed top-10 right-4 w-[14rem] text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
                      })
                      setModel(ModelMap.Baidu.id)
                    }}
                  >
                    {ModelMap.Baidu.name}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub> */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>颜色模式</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="dark:bg-zinc-600 min-w-24">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="w-5 mr-2 transition-all" />
                    浅色模式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="w-5 mr-2 transition-all" />
                    深色模式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <SunMoon className="w-5 mr-2 transition-all" />
                    跟随系统
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="focus-visible:ring-0 focus-visible:ring-offset-0 h-7"
            >
              激活
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="dark:bg-zinc-600 min-w-24" align="start">
            <DropdownMenuItem onClick={() => openDialog('freeTrial')}>试用</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog('active')}>激活</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog('activeCode')}>获取激活码</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="focus-visible:ring-0 focus-visible:ring-offset-0 h-7 hidden"
            >
              帮助
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="dark:bg-zinc-600 min-w-[5.2rem]" align="start">
            <DropdownMenuItem
              onClick={() => openExternal('https://proxy.cors.api.third.byteray.net')}
            >
              常见问题
            </DropdownMenuItem>
            <DropdownMenuItem>客户服务</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>官方网站</DropdownMenuItem>
            <DropdownMenuItem>检查更新</DropdownMenuItem>
            <DropdownMenuItem>关于我们</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="pr-2 h-full flex flex-row min-w-[80px] justify-around items-center">
        <LuMinusCircle
          onClick={minimizeWindow}
          className="text-green-600 dark:text-green-500 w-6 rounded-full dark:hover:text-green-600"
        />

        {maxmized ? (
          <LuMinimize2
            onClick={maxmizeWindow}
            className="text-orange-600 dark:text-orange-500 w-6  rounded-full dark:hover:text-orange-600"
          />
        ) : (
          <LuMaximize
            onClick={maxmizeWindow}
            className="text-orange-600 dark:text-orange-500 w-6 rounded-full dark:hover:text-orange-600 "
          />
        )}
        <LuXCircle
          onClick={closeWindow}
          className="text-rose-600 dark:text-rose-500 w-6 rounded-full dark:hover:text-rose-600"
        />
      </div>
    </div>
  )
}
