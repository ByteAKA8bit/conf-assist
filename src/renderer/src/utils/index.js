import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function generateRandomString(length) {
  const characters = 'abcdef0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }
  return result
}

export const { requestMediaAccess, audioGetSource, openExternal, getMachineID, openDevTools } =
  window.api
