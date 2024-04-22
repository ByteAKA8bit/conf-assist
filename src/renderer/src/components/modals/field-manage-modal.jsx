import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@components/ui/form'
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
import { Input } from '../ui/input'
import { useIndustry } from '@/hooks/use-industry'

const fromScheme = z.object({
  industry: z
    .string()
    .min(1, { message: '行业不能为空' })
    .max(20, { message: '自定义行业不能超过20个字' }),
  position: z
    .string()
    .min(1, { message: '岗位不能为空' })
    .max(20, { message: '自定义岗位不能超过20个字' }),
})

export const FieldManageModal = () => {
  const { isOpen, closeDialog, type } = useDialog()
  const { toast } = useToast()

  const { industryList, setIndustryList, setIndustry } = useIndustry()

  const isModalOpen = isOpen && type === 'fieldManage'

  const form = useForm({
    resolver: zodResolver(fromScheme),
    defaultValues: {
      industry: '',
      position: '',
    },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = (values) => {
    if (industryList[values.industry]) {
      setIndustryList({
        ...industryList,
        [values.industry]: [...industryList[values.industry], values.position],
      })
    } else {
      setIndustryList({ ...industryList, [values.industry]: [values.position] })
    }

    // 更新选择的行业和选择的岗位
    setIndustry({ industry: values.industry, position: values.position })

    toast({
      title: '添加成功',
      description: `行业：${values.industry}，岗位：${values.position}`,
      duration: 1500,
      className:
        'bg-green-400/90 fixed top-10 right-4 w-1/3 text-white border-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-full',
    })
    // closeDialog()
  }

  const handleClose = () => {
    closeDialog()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black dark:bg-zinc-600 dark:text-white p-2 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">自定义行业-岗位</DialogTitle>
          <DialogDescription className="text-center">
            保存后会自动使用刚定义的行业和岗位
            <br />
            可以在设置中切换
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 space-y-2">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>行业</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0 dark:bg-zinc-400/50 dark:text-white"
                      placeholder="互联网"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-rose-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>岗位</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0 dark:bg-zinc-400/50 dark:text-white"
                      placeholder="前端开发"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-rose-400" />
                </FormItem>
              )}
            />
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
