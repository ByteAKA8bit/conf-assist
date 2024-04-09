import { create } from 'zustand'

export const useSpeechSupplier = create((set) => ({
  supplier: localStorage.supplier || 'xunfei',
  setSupplier: (supplier) => {
    localStorage.supplier = supplier
    return set({ supplier })
  },
}))
