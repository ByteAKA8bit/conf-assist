import { create } from 'zustand'
import { ModelMap } from '@/utils/constant'

export const useModel = create((set) => ({
  model: localStorage.selectedModel || ModelMap.Aliyun.id,
  setModel: (model) => {
    localStorage.selectedModel = model
    return set({ model })
  },
}))
