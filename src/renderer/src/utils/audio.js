export function collectAudioStreamData() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const audioContext = new AudioContext()
    const mediaStreamSource = audioContext.createMediaStreamSource(stream)
    audioContext.audioWorklet.addModule('audioStream2BinaryProcessor.js').then(() => {
      const audioProcessorNode = new AudioWorkletNode(
        audioContext,
        'audio-stream-to-binary-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1
        }
      )
      audioProcessorNode.port.onmessage = (event) => {
        console.log(event)
      }
      mediaStreamSource &&
        mediaStreamSource.connect(audioProcessorNode).connect(audioContext.destination)
    })
  })
}
