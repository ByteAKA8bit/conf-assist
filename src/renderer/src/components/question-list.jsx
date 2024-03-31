import { forwardRef } from 'react'
import { cn } from '../utils'

export const QuestionList = ({ list, newQuestion, selected, onSelect }, divRef) => {
  return (
    <div ref={divRef}>
      {!!newQuestion && <Question className="bg-zinc-800" question={{ question: newQuestion }} />}
      {list
        .map((question, index) => {
          return (
            <Question
              onClick={() => {
                onSelect(index)
              }}
              className={index === selected && !newQuestion && 'bg-zinc-800'}
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
      className={cn('m-2 p-2 bg-zinc-600 rounded-xl text-sm hover:bg-zinc-800/50', className)}
    >
      {question.question}
    </div>
  )
}

export const ForwardQuestionList = forwardRef(QuestionList)
