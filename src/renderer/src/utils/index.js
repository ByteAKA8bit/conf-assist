import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const {
  mainFetch,
  wsCreate,
  wsSend,
  wsClose,
  wsOnOpen: wsOnOpenRegister,
  wsOnMessage: wsOnMessageRegister,
  wsOnClose: wsOnCloseRegister,
  wsOnError: wsOnErrorRegister,
  requestMediaAccess,
  audioGetSource,
  openExternal,
  getMachineID,
} = window.api

export const generateWebSocketID = () => {
  return uuidv4()
}
