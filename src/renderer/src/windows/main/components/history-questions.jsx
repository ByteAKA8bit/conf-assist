import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getDB } from '@/utils/indexedDB'
import { cn } from '@utils'
import { useEffect, useState } from 'react'

export const HistoryQuestions = ({ selected, onSelect }) => {
  const db = getDB()

  const [history, setHistory] = useState([])

  const handleQuestionClick = (question) => {
    onSelect(question)
  }

  useEffect(() => {
    // 查询到今天为止的所有问题，并通过天进行分类
    const range = IDBKeyRange.bound(0, new Date().getTime())
    db.open([{ name: 'question', keyPath: 'timestamp' }]).then(() => {
      db.query('question', range).then((res) => {
        const records = {}
        res.reverse().forEach((item) => {
          const timestamp = item.timestamp
          const date = new Date(timestamp)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const formattedDate = `${year}-${month}-${day}`

          if (!records[formattedDate]) {
            records[formattedDate] = []
          }
          records[formattedDate].push({ timestamp, question: item.question, answer: item.answer })
        })

        setHistory(records)
        db.close()
      })
    })
  }, [])

  return (
    <div className="overflow-auto px-1">
      <Accordion type="single" collapsible>
        {Object.entries(history).map(([date, questions]) => {
          return (
            <AccordionItem value={date} key={date} className="border-b-0 m-1 rounded-xl">
              <AccordionTrigger className="m-0 p-3 hover:no-underline hover:bg-zinc-300 dark:hover:bg-zinc-800 rounded-xl data-[state=open]:bg-zinc-200 dark:data-[state=open]:bg-zinc-800/50">
                {date}
              </AccordionTrigger>
              <AccordionContent className="p-0 m-1">
                {questions.map((question) => {
                  return (
                    <Question
                      key={question.timestamp}
                      question={question}
                      className={
                        question.timestamp === selected?.timestamp &&
                        'bg-zinc-200 dark:bg-zinc-800/50'
                      }
                      onClick={handleQuestionClick}
                    />
                  )
                })}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

const Question = ({ question, className, onClick }) => {
  const handleClick = () => {
    onClick(question)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'mt-2 p-3 bg-zinc-100 hover:bg-zinc-300 dark:bg-zinc-600 rounded-xl text-sm dark:hover:bg-zinc-800',
        className,
      )}
    >
      {question.question}
    </div>
  )
}
