import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { Form, FormControl, FormField, FormItem, FormMessage } from '@components/ui/form'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ActiveBaseUrl } from '@/utils/constant'
import { useDialog } from '@/hooks/use-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getMachineID } from '@/utils'

const formSchema = z.object({
  activeCode: z.string().max(100, { message: '激活码最多为100个字符' }),
})

export const ActiveModal = () => {
  const { isOpen, closeDialog, type } = useDialog()

  const isModalOpen = isOpen && type === 'active'

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activeCode: localStorage.activeCode || '',
    },
  })

  const [actived, setActived] = useState(localStorage.actived === '1')

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values) => {
    // 记录激活码
    localStorage.activeCode = values.activeCode
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')

    if (!localStorage.machineID) {
      localStorage.machineID = await getMachineID()
    }

    const raw = JSON.stringify({
      activeCode: values.activeCode,
      machineID: localStorage.machineID,
    })

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      signal: controller.signal,
      redirect: 'follow',
    }

    try {
      const response = await fetch(`${ActiveBaseUrl}/activate`, requestOptions)
      const result = await response.json()
      if (result.code !== 200) {
        throw new Error('激活失败')
      }
      localStorage.actived = result.data.actived
      localStorage.activeID = result.data.id
      localStorage.activeTimeleft = result.data.timeleft
      // 试用失效
      localStorage.FreeTrialTimeleft = 0
      localStorage.FreeTrial = 'expired'
      setActived(true)
    } catch (error) {
      console.error(error)
    } finally {
      clearTimeout(timerId)
    }
  }

  const convertToText = (milliseconds) => {
    const number = Number(milliseconds)
    const seconds = number / 1000
    const hours = Math.floor(seconds / 3600)
    const remainingSeconds = seconds % 3600
    const minutes = Math.floor(remainingSeconds / 60)
    const remainingSecondsFinal = Math.floor(remainingSeconds % 60)
    if (hours === 0) {
      return `${minutes}分钟${remainingSecondsFinal}秒`
    }
    return `${hours}小时${minutes}分钟${remainingSecondsFinal}秒`
  }

  const handleClose = () => {
    form.reset()
    closeDialog()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      {!actived ? (
        <DialogContent className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden">
          <DialogHeader className="pt-6 px-6">
            <DialogTitle className="text-2xl text-center font-bold">使用激活码激活</DialogTitle>
            <DialogDescription className="text-center">
              激活后并不会立刻开始计时
              <br />
              点击开始按钮才会开始计时，点击结束停止计时
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 space-y-4">
              <FormField
                control={form.control}
                name="activeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0 dark:bg-zinc-400/50 dark:text-white"
                        placeholder="请输入激活码"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-rose-400" />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex items-center pb-4">
                <span className="text-zinc-400 text-xs">
                  {localStorage.FreeTrial !== 'expired'
                    ? `免费试用时间剩余：${convertToText(localStorage.FreeTrialTimeleft || 15 * 60 * 1000)}`
                    : '免费试用已结束'}
                </span>

                <Button disabled={isLoading} type="submit">
                  激活
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      ) : (
        <DialogContent className="bg-white text-black dark:bg-zinc-600 dark:text-white overflow-hidden">
          <DialogHeader className="pt-4 px-6">
            <DialogTitle className="text-2xl text-center font-bold">已激活</DialogTitle>
          </DialogHeader>
          <div className="w-full flex flex-col py-4 px-4 space-y-4">
            <div className="space-y-2">
              <span>当前激活码</span>
              <Input disabled value={localStorage.activeCode} />
            </div>
            <div className="space-y-2">
              <span>剩余时间</span>
              <Input disabled value={convertToText(localStorage.activeTimeleft)} />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
