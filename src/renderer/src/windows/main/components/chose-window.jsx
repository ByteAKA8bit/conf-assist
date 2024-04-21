import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { cn } from '@/utils'
import { DialogTitle } from '@radix-ui/react-dialog'
import { useState } from 'react'

function ChoseWindowDialog({ open, setOpen, sources, onConfirm }) {
  const [chosed, setChosed] = useState('microphone')

  const handleClick = () => {
    onConfirm(chosed)
  }

  const handleOpenChange = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-[80vw]">
        <DialogHeader className="pt-4 px-4">
          <DialogTitle className="text-2xl text-center font-bold">选择会议</DialogTitle>
          <DialogDescription className="text-center">
            请选择使用会议助手的窗口(例如：腾讯会议)或直接使用麦克风 <br />
            不确定该选择哪个窗口时请选择整个屏幕
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap max-h-[60vh] justify-evenly items-center w-full overflow-auto">
          <div
            onClick={() => {
              setChosed('microphone')
            }}
            className={cn(
              'flex flex-col items-center ring-2 ring-zinc-100 my-2 pt-4 px-4 pb-2 rounded-lg hover:bg-blue-400',
              chosed === 'microphone' && 'bg-blue-500/90 ring-2 hover:bg-blue-500 text-zinc-100',
            )}
          >
            <img
              src="./images/icon.svg"
              alt="麦克风"
              className="rounded-lg w-full max-h-[128px] p-4 bg-zinc-100"
            />
            电脑麦克风输入
          </div>
          {sources?.map((source) => {
            if (source.id.includes('window')) {
              const title = source.name.split(' - ')
              source.name = title[title.length - 1]
            }
            return (
              <div
                onClick={() => {
                  setChosed(source)
                }}
                key={source.id}
                className={cn(
                  'flex flex-col items-center ring-2 ring-zinc-100 my-2 mx-2 pt-4 px-4 pb-2 rounded-lg hover:bg-blue-400',
                  source.id === chosed?.id &&
                    'bg-blue-500/90 ring-2 hover:bg-blue-500 text-zinc-100',
                )}
              >
                <img
                  src={source.thumbnailURL}
                  alt={source.name}
                  className="rounded-lg w-full max-h-[128px]"
                />
                {source.name}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleClick}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ChoseWindowDialog
