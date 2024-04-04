import { ModelMap } from '@/utils/constant'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'

export const ModelSelect = ({ selectedModel, onModelChange }) => {
  const handleValueChange = (id) => {
    switch (id) {
      case ModelMap.Gemini.id:
        onModelChange(ModelMap.Gemini)
        break
      case ModelMap.Aliyun.id:
        onModelChange(ModelMap.Aliyun)
        break
      case ModelMap.Baidu.id:
        onModelChange(ModelMap.Baidu)
        break
    }
  }

  return (
    <Select value={selectedModel.id} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full bg-zinc-500 h-8">
        <SelectValue placeholder="Theme" value={selectedModel.name} />
      </SelectTrigger>
      <SelectContent className="bg-zinc-500">
        <SelectItem value={ModelMap.Gemini.id}>{ModelMap.Gemini.name}</SelectItem>
        <SelectItem value={ModelMap.Aliyun.id}>{ModelMap.Aliyun.name}</SelectItem>
        <SelectItem value={ModelMap.Baidu.id}>{ModelMap.Baidu.name}</SelectItem>
      </SelectContent>
    </Select>
  )
}
