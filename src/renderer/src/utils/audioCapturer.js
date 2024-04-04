function to16BitPCM(input) {
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
function to16kHz(audioData, sampleRate = 44100) {
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

const TAG = 'AudioCapturer'
navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia

export class AudioCapturer {
  constructor(source, onReceivedData, onError, onStop, isLog) {
    this.audioData = []
    this.allAudioData = []
    this.stream = null
    this.audioContext = null
    this.frameTime = []
    this.frameCount = 0
    this.sampleCount = 0
    this.bitCount = 0
    this.mediaStreamSource = null
    this.isLog = isLog
    this.source = source
    this.onReceivedData = onReceivedData
    this.onError = onError
    this.onStop = onStop
  }
  static isSupportMediaDevicesMedia() {
    return !!(
      navigator.getUserMedia ||
      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    )
  }
  static isSupportUserMediaMedia() {
    return !!navigator.getUserMedia
  }
  static isSupportAudioContext() {
    return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
  }
  static isSupportMediaStreamSource(audioContext) {
    return typeof audioContext.createMediaStreamSource === 'function'
  }
  static isSupportAudioWorklet(audioContext) {
    return (
      audioContext.audioWorklet &&
      typeof audioContext.audioWorklet.addModule === 'function' &&
      typeof AudioWorkletNode !== 'undefined'
    )
  }
  static isSupportCreateScriptProcessor(audioContext) {
    return typeof audioContext.createScriptProcessor === 'function'
  }
  async getUserMedia(getStreamAudioSuccess, getStreamAudioFail) {
    const mediaOption = {
      audio: {
        device_id: this.source.id,
      },
      video: false,
    }
    if (this.source === 'microphone') {
      // 麦克风
      mediaOption.audio = true
    }

    if (AudioCapturer.isSupportMediaDevicesMedia()) {
      navigator.mediaDevices
        .getUserMedia(mediaOption)
        .then((stream) => {
          this.stream = stream
          getStreamAudioSuccess.call(this, stream)
        })
        .catch((e) => {
          getStreamAudioFail.call(this, e)
        })
    } else if (AudioCapturer.isSupportUserMediaMedia()) {
      navigator.getUserMedia(
        mediaOption,
        (stream) => {
          this.stream = stream
          getStreamAudioSuccess.call(this, stream)
        },
        function (err) {
          getStreamAudioFail.call(this, err)
        },
      )
    } else {
      if (
        navigator.userAgent.toLowerCase().match(/chrome/) &&
        location.origin.indexOf('https://') < 0
      ) {
        this.isLog &&
          console.log(
            'chrome下获取浏览器录音功能，因为安全性问题，需要在localhost或127.0.0.1或https下才能获取权限',
            TAG,
          )
        this.onError(
          'chrome下获取浏览器录音功能，因为安全性问题，需要在localhost或127.0.0.1或https下才能获取权限',
        )
      } else {
        this.isLog && console.log('无法获取浏览器录音功能，请升级浏览器或使用chrome', TAG)
        this.onError('无法获取浏览器录音功能，请升级浏览器或使用chrome')
      }
      this.audioContext && this.audioContext.close()
    }
  }
  async getAudioSuccess(stream) {
    if (!this.audioContext) {
      return false
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }
    this.audioTrack = stream.getAudioTracks()[0]
    const mediaStream = new MediaStream()
    mediaStream.addTrack(this.audioTrack)
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream)
    if (AudioCapturer.isSupportMediaStreamSource(this.audioContext)) {
      if (AudioCapturer.isSupportAudioWorklet(this.audioContext)) {
        // 不支持 AudioWorklet 降级
        this.audioWorkletNodeDealAudioData(this.mediaStreamSource)
      } else {
        this.scriptNodeDealAudioData(this.mediaStreamSource)
      }
    } else {
      // 不支持 MediaStreamSource
      this.isLog && console.log('不支持MediaStreamSource', TAG)
      this.onError('不支持MediaStreamSource')
    }
  }
  getAudioFail(err) {
    if (err && err.err && err.err.name === 'NotAllowedError') {
      this.isLog && console.log('授权失败', JSON.stringify(err.err), TAG)
    }
    this.isLog && console.log('getAudioFail', JSON.stringify(err), TAG)
    this.onError(err)
    this.stop()
  }
  scriptNodeDealAudioData(mediaStreamSource) {
    if (AudioCapturer.isSupportCreateScriptProcessor(this.audioContext)) {
      // 创建一个音频分析对象，采样的缓冲区大小为0（自动适配），输入和输出都是单声道
      const scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1)
      // 连接
      mediaStreamSource && mediaStreamSource.connect(scriptProcessor)
      scriptProcessor && scriptProcessor.connect(this.audioContext.destination)
      scriptProcessor.onaudioprocess = (e) => {
        this.getDataCount += 1
        // 去处理音频数据
        const inputData = e.inputBuffer.getChannelData(0)
        const output = to16kHz(inputData, this.audioContext.sampleRate)
        const audioData = to16BitPCM(output)
        this.audioData.push(...new Int8Array(audioData.buffer))
        this.allAudioData.push(...new Int8Array(audioData.buffer))
        if (this.audioData.length > 1280) {
          this.frameTime.push(`${Date.now()}-${this.frameCount}`)
          this.frameCount += 1
          const audioDataArray = new Int8Array(this.audioData)
          this.onReceivedData(audioDataArray)
          this.audioData = []
          this.sampleCount += 1
          this.bitCount += 1
        }
      }
    } else {
      // 不支持
      this.isLog && console.log('不支持createScriptProcessor', TAG)
    }
  }
  async audioWorkletNodeDealAudioData(mediaStreamSource) {
    try {
      await this.audioContext.audioWorklet.addModule('audioStream2BinaryProcessor.js')
      const myNode = new AudioWorkletNode(this.audioContext, 'audio-stream-to-binary-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      })

      myNode.onprocessorerror = () => {
        // 降级
        this.scriptNodeDealAudioData(mediaStreamSource)
        return false
      }

      myNode.port.onmessage = (event) => {
        this.frameTime.push(`${Date.now()}-${this.frameCount}`)
        this.onReceivedData(event.data.audioData)
        this.frameCount += 1
        this.allAudioData.push(...event.data.audioData)
        this.sampleCount = event.data.sampleCount
        this.bitCount = event.data.bitCount
      }
      myNode.port.onmessageerror = () => {
        // 降级
        this.scriptNodeDealAudioData(mediaStreamSource)
        return false
      }
      mediaStreamSource && mediaStreamSource.connect(myNode).connect(this.audioContext.destination)
    } catch (e) {
      this.isLog && console.log('audioWorkletNodeDealAudioData catch error', JSON.stringify(e), TAG)
      this.onError(e)
    }
  }
  start() {
    this.frameTime = []
    this.frameCount = 0
    this.allAudioData = []
    this.audioData = []
    this.sampleCount = 0
    this.bitCount = 0
    this.getDataCount = 0
    this.audioContext = null
    this.mediaStreamSource = null
    this.stream = null
    try {
      if (AudioCapturer.isSupportAudioContext()) {
        this.audioContext = new (AudioContext || window.webkitAudioContext)()
      } else {
        this.isLog && console.log('浏览器不支持AudioContext', TAG)
        this.onError('浏览器不支持AudioContext')
      }
    } catch (e) {
      this.isLog && console.log('浏览器不支持webAudioApi相关接口', e, TAG)
      this.onError('浏览器不支持webAudioApi相关接口')
    }
    this.getUserMedia(this.getAudioSuccess, this.getAudioFail)
  }
  stop() {
    if (!(/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent))) {
      this.audioContext && this.audioContext.suspend()
    }
    this.audioContext && this.audioContext.suspend()
    this.isLog &&
      console.log(
        `audioCapturer stop ${this.sampleCount}/${this.bitCount}/${this.getDataCount}`,
        JSON.stringify(this.frameTime),
        TAG,
      )
    this.onStop(this.allAudioData)
  }
  destroyStream() {
    // 关闭通道
    if (this.stream) {
      this.stream.getTracks().map((track) => {
        track.stop()
      })
      this.stream = null
    }
  }
}
