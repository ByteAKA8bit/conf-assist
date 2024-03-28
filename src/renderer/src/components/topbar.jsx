import { useState } from 'react'
import { LuXCircle, LuMinusCircle, LuMaximize, LuMinimize2 } from 'react-icons/lu'

export const Topbar = () => {
  const [maxmized, setMaxmized] = useState(false)
  const closeWindow = window.electron.close
  const minimizeWindow = window.electron.minimize

  const maxmizeWindow = () => {
    setMaxmized((max) => !max)
    window.electron.maxmize()
  }

  return (
    <div className="absolute inset-0 bg-transparent h-10 flex justify-start items-center ">
      <div className="pl-2 h-full flex flex-row w-[75px] justify-around items-center">
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
      <header className="absolute ml-[75px] inset-0 bg-transparent h-10" />
    </div>
  )
}
