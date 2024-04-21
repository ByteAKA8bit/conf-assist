import { useEffect, useState } from 'react'
import { cn } from '@utils'
import { ServerStateMap } from '@utils/constant'
import { Button } from '@components/ui/button'

export const ActionButton = ({ start, reGenerate, serverState }) => {
  const [generateButtonProps, setGenerateButtonProps] = useState(ServerStateMap.Init.generate)
  const [actionButtonProps, setActionButtonProps] = useState(ServerStateMap.Init.action)

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
          'transition-[width,background-color,display] hidden dark:text-white text-sm tracking-wider font-medium rounded-lg px-5 py-2.5 me-1 focus:outline-none focus:ring-2 dark:focus:ring-gray-300',
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
        className={cn(
          'transition-[width,background-color] absolute right-0 top-[-2.5rem] dark:text-white text-sm tracking-wider bg-green-500 hover:bg-green-400 rounded-lg  px-5 py-2.5 ms-1 w-full  focus:outline-none focus:ring-2 dark:focus:ring-gray-300',
          actionButtonProps.className,
        )}
      >
        {actionButtonProps.icon && <actionButtonProps.icon className="w-4 mr-1" />}
        {actionButtonProps.children}
      </Button>
    </div>
  )
}
