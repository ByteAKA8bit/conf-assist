import { useDialog } from '@/hooks/use-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const ActiveCodeModal = () => {
  const { isOpen, closeDialog, type } = useDialog()

  const isModalOpen = isOpen && type === 'activeCode'

  const handleClose = () => {
    closeDialog()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault()
        }}
        className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden"
      >
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">扫码获取激活码</DialogTitle>
          <DialogDescription className="text-center">打开淘宝扫描二维码查看详情</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pb-4">
          <img src="./images/qrcode.png" alt="淘宝链接" className="w-[45vh] h-[50vh] " />
        </div>
      </DialogContent>
    </Dialog>
  )
}
