import { create } from 'zustand'

export const useDialog = create((set) => ({
  type: null,
  data: {},
  isOpen: false,
  openDialog: (type, data = {}) => set({ isOpen: true, type, data }),
  closeDialog: () => set({ isOpen: false, type: null }),
}))
