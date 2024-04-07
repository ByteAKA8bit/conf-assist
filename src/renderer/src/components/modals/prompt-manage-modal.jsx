import * as z from 'zod'
import { useModal } from '@/hooks/use-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem } from '@components/ui/form'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { useToast } from '@components/ui/use-toast'

const fromScheme = z.object({
  prefix: z.string().max(120, { message: '前缀不能多于120字' }),
})

export const PromptManageModal = () => {
  const { isOpen, onClose, type } = useModal()
  const { toast } = useToast()

  const isModalOpen = isOpen && type === 'promptManage'

  const form = useForm({
    resolver: zodResolver(fromScheme),
    defaultValues: {
      prefix: localStorage.promptPrefix || '',
    },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = (values) => {
    localStorage.promptPrefix = values.prefix

    toast({
      title: '保存成功',
      duration: 1000,
      className: 'bg-green-400',
    })
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">自定义问题前缀</DialogTitle>
          <DialogDescription className="text-center">
            在问题前添加前缀，可使模型按照自己需要的方式生成回答
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6">
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0 dark:bg-zinc-400/50 dark:text-white"
                        placeholder="请用一句话简单回答后再详细论述"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="px-6 pt-4 pb-2">
              <Button disabled={isLoading} variant="primary">
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
