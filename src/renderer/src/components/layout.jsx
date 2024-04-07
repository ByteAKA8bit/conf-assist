import { forwardRef } from 'react'
import { cn } from '../utils'

export const Layout = ({ className, children, ...props }) => {
  return (
    <main className={cn('flex flex-row h-screen', className)} {...props}>
      {children}
    </main>
  )
}

export const Sidebar = ({ className, children, ...props }) => {
  return (
    <aside
      onClick={(events) => {
        events.stopPropagation()
      }}
      className={cn('w-1/4 mt-8 min-w-[300px] h-[calc(100vh-2rem)] overflow-auto', className)}
      {...props}
    >
      {children}
    </aside>
  )
}

export const Content = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex-1 overflow-auto', className)} {...props}>
      {children}
    </div>
  )
})

Content.displayName = 'Content'
