import { Button } from '@components/ui/button'
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
import { ActiveBaseUrl } from '@/utils/constant'
import { useState } from 'react'

export const FreeTrialModal = () => {
  const { openDialog, isOpen, closeDialog, type } = useDialog()

  const isModalOpen = isOpen && type === 'freeTrial'

  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    closeDialog()
  }

  const startFreeTrial = async () => {
    if (localStorage.freeTrial && localStorage.freeTrial !== 'expired') {
      closeDialog()
      return
    }
    setLoading(true)

    if (!localStorage.machineID) {
      localStorage.machineID = await getMachineID()
    }
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      signal: controller.signal,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        `${ActiveBaseUrl}/start-trial?machineID=${localStorage.machineID}`,
        requestOptions,
      )
      const result = await response.json()
      if (
        result.code === 500 &&
        result.data.includes('UNIQUE constraint failed: free_trial.machine_id')
      ) {
        localStorage.freeTrialTimeleft = 0
        localStorage.freeTrial = 'expired'
      }
      if (result.code !== 200) {
        throw new Error('服务器返回错误')
      }
      if (localStorage.freeTrialTimeleft === undefined) {
        localStorage.freeTrialTimeleft = 900000
        localStorage.freeTrial = new Date().getTime()
      }
      closeDialog()
    } catch (error) {
      console.error(error)
    } finally {
      clearTimeout(timerId)
      setLoading(false)
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

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault()
        }}
        className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden"
      >
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            免费试用{localStorage.freeTrial === 'expired' && '已结束'}
          </DialogTitle>
          {localStorage.freeTrial !== 'expired' ? (
            <DialogDescription className="text-center">
              剩余{convertToText(localStorage.freeTrialTimeleft || 15 * 60 * 1000)}
              的免费试用时间，激活后失效
            </DialogDescription>
          ) : (
            <DialogDescription className="text-center">请获取激活码后激活使用</DialogDescription>
          )}
        </DialogHeader>
        {localStorage.freeTrial !== 'expired' ? (
          <DialogFooter className="px-6 pb-4">
            <Button
              disabled={loading}
              onClick={() => {
                closeDialog()
                openDialog('active')
              }}
            >
              激活
            </Button>
            <Button disabled={loading} onClick={startFreeTrial}>
              试用
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="px-6 pb-4">
            <Button
              disabled={loading}
              onClick={() => {
                openDialog('activeCode')
              }}
            >
              获取激活码
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
