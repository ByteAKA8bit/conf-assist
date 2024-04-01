import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export const cn = (...args) => {
  return twMerge(clsx(...args))
}

export const {
  mainFetch,
  wsCreate,
  wsSend,
  wsClose,
  wsCreated: wsCreatedRegister,
  wsReceived: wsReceivedRegister,
  wsClosed: wsClosedRegister,
  wsError: wsErrorRegister,
  requestMediaAccess,
  audioGetSource
} = window.api

export const generateWebSocketID = () => {
  return uuidv4()
}
