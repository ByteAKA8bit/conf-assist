import { useEffect, useState } from 'react'
import { ActiveModal } from '@/components/modals/active-modal'
import { PromptManageModal } from '@/components/modals/prompt-manage-modal'

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <>
      <PromptManageModal />
      <ActiveModal />
    </>
  )
}
