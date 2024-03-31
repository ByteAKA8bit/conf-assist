export const Prompt = ({ handleStart, handleRegenerate, isRecording, connectingAudioServer }) => {
  return (
    <div className="inline-flex w-[calc(75vw-1rem)] max-w-[calc(100vw-300px-1rem)] fixed bottom-2">
      <button
        disabled={connectingAudioServer}
        onClick={handleRegenerate}
        type="button"
        className=" text-white bg-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 me-1 w-1/2 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 "
      >
        {connectingAudioServer ? '正在连接或正在识别' : '重新生成'}
      </button>
      <button
        disabled={connectingAudioServer}
        onClick={handleStart}
        type="button"
        className="text-white bg-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 ms-1 w-1/2 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300  disabled:hover:bg-gray-800"
      >
        {connectingAudioServer ? '请稍等' : isRecording ? '结束' : '开始'}
      </button>
    </div>
  )
}
