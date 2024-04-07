import MainWindow from '@pages/main-window'
import { ThemeProvider } from '@provider/theme-provider'
import { ModalProvider } from '@provider/modal-provider'
import { Toaster } from '@components/ui/toaster'

function App() {
  return (
    <ThemeProvider>
      <ModalProvider />
      <MainWindow />
      <Toaster />
    </ThemeProvider>
  )
}

export default App
