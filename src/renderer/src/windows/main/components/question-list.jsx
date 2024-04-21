import { cn } from '@utils'

export const QuestionList = ({ list, newQuestion, selected, onSelect }) => {
  // 新问题
  // 父组件接到新问题，传递给子组件
  // 子组件接收到新问题变更，实时显示新问题
  // 新问题会在发起回答请求时被添加
  // 会在回答开始时被实时更新
  // 点击问题时向父组件抛出点击的问题
  // 问题列表

  const handleQuestionClick = (id) => {
    onSelect(id)
  }

  return (
    <div className="overflow-auto px-2">
      {!!newQuestion && (
        <Question className="bg-zinc-200 dark:bg-zinc-800" question={{ question: newQuestion }} />
      )}
      {list
        .map((question) => {
          return (
            <Question
              onClick={handleQuestionClick}
              className={
                question.timestamp === selected?.timestamp &&
                !newQuestion &&
                'bg-zinc-200 dark:bg-zinc-800'
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
  const handleClick = () => {
    onClick(question.timestamp)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'mt-2 p-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-600 rounded-xl text-sm dark:hover:bg-zinc-800/50 scroll-smooth',
        className,
      )}
    >
      {question.question}
    </div>
  )
}
