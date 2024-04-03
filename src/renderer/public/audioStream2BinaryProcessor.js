class AudioStream2BinaryProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options)
    this.audioData = []
    this.nextUpdateFrame = 40
    this.sampleCount = 0
    this.bitCount = 0
  }

  get intervalInFrames() {
    return (40 / 1000) * sampleRate
  }

  to16BitPCM(input) {
    const dataLength = input.length * (16 / 8)
    const dataBuffer = new ArrayBuffer(dataLength)
    const dataView = new DataView(dataBuffer)
    let offset = 0
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return dataView
  }

  to16kHz(audioData, sampleRate = 44100) {
    const data = new Float32Array(audioData)
    const fitCount = Math.round(data.length * (16000 / sampleRate))
    const newData = new Float32Array(fitCount)
    const springFactor = (data.length - 1) / (fitCount - 1)
    newData[0] = data[0]
    for (let i = 1; i < fitCount - 1; i++) {
      const tmp = i * springFactor
      const before = Math.floor(tmp).toFixed()
      const after = Math.ceil(tmp).toFixed()
      const atPoint = tmp - before
      newData[i] = data[before] + (data[after] - data[before]) * atPoint
    }
    newData[fitCount - 1] = data[data.length - 1]
    return newData
  }

  process(inputs) {
    if (inputs[0][0]) {
      const output = this.to16kHz(inputs[0][0], sampleRate)
      this.sampleCount += 1
      const audioData = this.to16BitPCM(output)
      this.bitCount += 1
      const data = [...new Int8Array(audioData.buffer)]
      this.audioData = this.audioData.concat(data)
      this.nextUpdateFrame -= inputs[0][0].length
      if (this.nextUpdateFrame < 0) {
        this.nextUpdateFrame += this.intervalInFrames
        this.port.postMessage({
          audioData: new Int8Array(this.audioData),
          sampleCount: this.sampleCount,
          bitCount: this.bitCount,
          output,
          audioDataRaw: audioData,
        })
        this.audioData = []
      }
      return true
    }
  }
}

// 注册 AudioWorkletProcessor 类
registerProcessor('audio-stream-to-binary-processor', AudioStream2BinaryProcessor)
