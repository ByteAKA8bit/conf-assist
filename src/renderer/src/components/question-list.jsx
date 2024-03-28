export const QuestionList = ({ list }) => {
  return list.map((question) => {
    return <Question key={question} question={question} />
  })
}

const Question = ({ question }) => {
  return <div className="m-2 p-1 h-[80px] bg-zinc-600 rounded-xl">{question}</div>
}
