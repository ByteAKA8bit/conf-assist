export const Prompt = ({ handleStart, handleRegenerate, isRecording }) => {
  return (
    <div className="inline-flex w-full">
      <button
        onClick={handleRegenerate}
        type="button"
        className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-1 w-1/2"
      >
        重新生成
      </button>
      <button
        onClick={handleStart}
        type="button"
        className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 ms-1 w-1/2"
      >
        {isRecording ? '结束' : '开始'}
      </button>
    </div>
  )
}
