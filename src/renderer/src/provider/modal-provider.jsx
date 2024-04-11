import { useEffect, useState } from 'react'
import { ActiveModal } from '@/components/modals/active-modal'
import { PromptManageModal } from '@/components/modals/prompt-manage-modal'
import { FreeTrialModal } from '@/components/modals/free-trial-modal'
import { ActiveCodeModal } from '@/components/modals/active-code-modal'

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
      <FreeTrialModal />
      <ActiveCodeModal />
    </>
  )
}
