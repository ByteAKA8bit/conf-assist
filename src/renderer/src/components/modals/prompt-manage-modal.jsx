import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@components/ui/form'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { useToast } from '@components/ui/use-toast'
import { useDialog } from '@/hooks/use-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const fromScheme = z.object({
  prefix: z.string().max(500, { message: '提示词不能多于120字' }),
})

export const PromptManageModal = () => {
  const { isOpen, closeDialog, type } = useDialog()
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
      className:
        'bg-green-400/90 fixed top-10 right-4 w-1/4 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
    })
    closeDialog()
  }

  const handleClose = () => {
    closeDialog()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">预设提示词</DialogTitle>
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
                        placeholder="请你扮演一个xxx岗位的面试者，我会问你一些面试的问题，请将问题回答分为核心回答和详细回答，核心回答尽量概括为一句话："
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-rose-400" />
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
