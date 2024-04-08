import { cn } from '@utils'

export const QuestionList = ({ list, newQuestion, selected, onSelect }) => {
  return (
    <div className="overflow-auto">
      {!!newQuestion && (
        <Question className="bg-zinc-200 dark:bg-zinc-800" question={{ question: newQuestion }} />
      )}
      {list
        .map((question) => {
          return (
            <Question
              onClick={() => {
                onSelect(question.timestamp)
              }}
              className={
                question.timestamp === selected && !newQuestion && 'bg-zinc-200 dark:bg-zinc-800'
              }
              key={question.timestamp}
              question={question}
            />
          )
        })
        .reverse()}
    </div>
  )
}

const Question = ({ question, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'm-2 p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-600 rounded-xl text-sm dark:hover:bg-zinc-800/50 scroll-smooth',
        className,
      )}
    >
      {question.question}
    </div>
  )
}
