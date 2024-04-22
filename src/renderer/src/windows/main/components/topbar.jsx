import { useState } from 'react'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { LuXCircle, LuMinusCircle, LuMaximize, LuMinimize2 } from 'react-icons/lu'

import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'

import { openExternal } from '@/utils'
import { useTheme } from '@/provider/theme-provider'
import { useDialog } from '@/hooks/use-dialog'
import { useIndustry } from '@/hooks/use-industry'

export const Topbar = () => {
  const [maxmized, setMaxmized] = useState(false)

  const { setTheme } = useTheme()
  const { openDialog } = useDialog()
  const { industryList, industry, position, setIndustry } = useIndustry()

  const closeWindow = window.electron.close
  const minimizeWindow = window.electron.minimize
  const maxmizeWindow = () => {
    setMaxmized((max) => !max)
    window.electron.maxmize()
  }

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
          <DropdownMenuContent className="dark:bg-zinc-600" align="start">
            <DropdownMenuItem className="hidden">语音识别热词</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog('promptManage')}>
              预设提示词
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>行业选择</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="dark:bg-zinc-600">
                {Object.entries(industryList).map(([key, value]) => {
                  return (
                    <DropdownMenuSub key={key}>
                      <DropdownMenuSubTrigger>{key}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="dark:bg-zinc-600">
                        {value.map((item) => {
                          return (
                            <DropdownMenuCheckboxItem
                              checked={industry === key && position === item}
                              onClick={() => {
                                setIndustry({ industry: key, position: item })
                              }}
                              key={item}
                            >
                              {item}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )
                })}
                <DropdownMenuItem
                  onClick={() => {
                    openDialog('fieldManage')
                  }}
                >
                  自定义
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>颜色模式</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="dark:bg-zinc-600">
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
          <DropdownMenuContent className="dark:bg-zinc-600" align="start">
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
