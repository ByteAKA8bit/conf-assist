import { useState } from 'react'
import { LuXCircle, LuMinusCircle, LuMaximize, LuMinimize2 } from 'react-icons/lu'
import { ThemeToggle } from '@/components/theme-toggle'
import { ModelSelect } from './model-select'

export const Topbar = (props) => {
  const [maxmized, setMaxmized] = useState(false)
  const closeWindow = window.electron.close
  const minimizeWindow = window.electron.minimize

  const maxmizeWindow = () => {
    setMaxmized((max) => !max)
    window.electron.maxmize()
  }
  return (
    <div className="absolute w-full inset-0 bg-transparent h-10 flex justify-start items-center ">
      <div className="pl-2 h-full flex flex-row min-w-[75px] justify-around items-center">
        <LuXCircle
          onClick={closeWindow}
          className="text-rose-500 h-4 w-4 bg-rose-500 rounded-full hover:bg-transparent"
          style={{ WebKitAppRegion: 'no-drag' }}
        />
        {maxmized ? (
          <LuMinimize2
            onClick={maxmizeWindow}
            className="text-orange-500 h-4 w-4 bg-orange-500 rounded-full hover:bg-transparent"
          />
        ) : (
          <LuMaximize
            onClick={maxmizeWindow}
            className="text-orange-500 h-4 w-4 bg-orange-500 rounded-full hover:bg-transparent"
          />
        )}
        <LuMinusCircle
          onClick={minimizeWindow}
          className="text-green-500 h-4 w-4 bg-green-500 rounded-full hover:bg-transparent"
        />
      </div>
      <div className="min-w-[225px] w-[calc(25vw-75px)] h-full flex items-center justify-center pl-2 pr-4 pt-1 text-white text-sm">
        <ModelSelect {...props} />
      </div>
      <header
        onDoubleClick={() => {
          setMaxmized((max) => !max)
        }}
        className="w-[calc(100vw-300px)] max-w-[calc(75vw)] inset-0 bg-transparent h-full"
      />
      {/* <ModeToggle /> */}
    </div>
  )
}
