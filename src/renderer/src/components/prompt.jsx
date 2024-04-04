import { useEffect, useState } from 'react'
import { cn } from '../utils'
import { ServerState } from '@utils/constant'
import { Button } from '@components/ui/button'

export const Prompt = ({ start, reGenerate, serverState }) => {
  const [generateButtonProps, setGenerateButtonProps] = useState(ServerState.Init.generate)
  const [actionButtonProps, setActionButtonProps] = useState(ServerState.Init.action)

  useEffect(() => {
    if (serverState) {
      const { generate, action } = serverState
      setGenerateButtonProps(generate)
      setActionButtonProps(action)
    }
  }, [serverState])

  return (
    <div className="inline-flex w-[calc(75vw-1rem)] max-w-[calc(100vw-300px-1rem)] fixed bottom-2 px-2">
      <Button
        disabled={generateButtonProps.disabled}
        onClick={reGenerate}
        type="button"
        className={cn(
          'transition-[width,background-color,display] hidden text-white text-sm tracking-wider font-medium rounded-lg px-5 py-2.5 me-1  focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:',
          generateButtonProps.className,
        )}
      >
        {generateButtonProps.children}
        {generateButtonProps.icon && (
          <generateButtonProps.icon className={cn('w-4 ml-1', generateButtonProps.iconAnimation)} />
        )}
      </Button>
      <Button
        disabled={actionButtonProps.disabled}
        onClick={start}
        type="button"
        className={cn(
          'transition-[width,background-color] absolute right-0 top-[-2.5rem] text-white text-sm tracking-wider bg-zinc-500 hover:bg-gray-700/50 rounded-lg  px-5 py-2.5 ms-1 w-full  focus:outline-none focus:ring-2 focus:ring-gray-300',
          actionButtonProps.className,
        )}
      >
        {/* {actionButtonProps.children} */}
        {actionButtonProps.icon && <actionButtonProps.icon className="w-5 mr-1" />}
      </Button>
    </div>
  )
}
