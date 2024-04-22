import { IndustryList } from '@/utils/constant'
import { create } from 'zustand'

export const useIndustry = create((set) => ({
  industryList: { ...IndustryList, ...JSON.parse(localStorage.IndustryList || '{}') },
  industry: localStorage.Industry,
  position: localStorage.Position,
  setIndustryList: (industryList) => {
    console.log(industryList)
    const uniqueIndustryList = {}
    Object.entries(industryList).map(([key, value]) => {
      const uniqueValue = new Set(value)
      uniqueIndustryList[key] = Array.from(uniqueValue)
    })
    localStorage.IndustryList = JSON.stringify(uniqueIndustryList)
    return set({ uniqueIndustryList })
  },
  setIndustry: ({ industry, position }) => {
    if (localStorage.Industry === industry && localStorage.Position === position) {
      localStorage.Industry = ''
      localStorage.Position = ''
      return set({ industry: '', position: '' })
    } else {
      localStorage.Industry = industry
      localStorage.Position = position
      return set({ industry, position })
    }
  },
}))
