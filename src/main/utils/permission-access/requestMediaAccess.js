import { systemPreferences } from 'electron'

// 检查用户电脑是否有安装SoundFlower或者BlackHole

async function getIfAlreadyInstallSoundFlowerOrBlackHole() {
  const devices = await navigator.mediaDevices.enumerateDevices()

  return devices.some(
    (device) =>
      device.label.includes('Soundflower (2ch)') ||
      device.label.includes('BlackHole 2ch (Virtual)'),
  )
}

/**
 * 请求媒体权限 MacOS
 * @param mediaType
 */
export const requestMediaAccess = async (mediaType) => {
  try {
    if (process.platform === 'darwin' || process.platform === 'win32') {
      // mac 需要引导用户安装blackHole
      if (process.platform === 'darwin') {
        if (!(await getIfAlreadyInstallSoundFlowerOrBlackHole())) {
          // 没安装
          return 'BlackHole_NOT_INSTALL'
        }
      }

      // 获取当前媒体设备（在这里指麦克风或摄像头）的访问权限状态
      const privilege = systemPreferences.getMediaAccessStatus(mediaType)

      if (privilege !== 'granted') {
        // 未授权,则重新唤起系统弹框,等待用户点击授权
        await systemPreferences.askForMediaAccess(mediaType)
        // 请求权限后，再次获取媒体访问状态并返回
        return systemPreferences.getMediaAccessStatus(mediaType)
      }
      // 已授权,则直接返回媒体访问状态
      return privilege
    }
    return 'granted'
  } catch (e) {
    console.error('Failed to request media access:', e)
    return 'unknown'
  }
}
