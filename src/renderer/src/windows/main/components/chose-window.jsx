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
  const [chosed, setChosed] = useState(null)

  const handleClick = () => {
    onConfirm(chosed)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setOpen(false)
        setChosed(null)
      }}
    >
      <DialogContent className="min-w-[80vw]">
        <DialogHeader className="pt-4 px-4">
          <DialogTitle className="text-2xl text-center font-bold">选择会议</DialogTitle>
          <DialogDescription className="text-center">
            请选择需要使用助手的会议窗口 <br />
            当您不确定该选择哪个窗口时请选择整个屏幕
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap max-h-[60vh] justify-evenly items-center w-full space-x-4 overflow-auto">
          {sources?.map((source) => {
            console.log(source.name)
            if (source.id.includes('window')) {
              console.log(source.name)
              const title = source.name.split(' - ')
              console.log(title)
              source.name = title[title.length - 1]
            }
            return (
              <div
                onClick={() => {
                  setChosed(source)
                }}
                key={source.id}
                className={cn(
                  'flex flex-col items-center ring-2 ring-zinc-100 mt-4 pt-4 px-4 pb-2 rounded-lg hover:bg-blue-400',
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
