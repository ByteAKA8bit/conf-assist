// 状态码 xxxx 第一位表示状态 第二位表示generate按钮是否可用 第三位表示action按钮是否可用 第四位往后是用于标识不同状态的随机值，不重复

import { Ear, Frown, Loader, Mic, Power, RotateCw, ScreenShareOff } from 'lucide-react'

// 使用 cloudflare workers 反向代理
// export const CorsProxyBaseUrl = 'http://localhost:8787'
export const CorsProxyBaseUrl = import.meta.env.VITE_CLOUDFLARE_CORS_PROXY_ADDRESS
export const ActiveBaseUrl = import.meta.env.VITE_CLOUDFLARE_ACTIVE_ADDRESS

// 第一位 状态 1：连接中 2：已成功 3：客户端主动断开 4：客户端错误 5：服务器错误 -1为初始状态
export const ServerStateMap = {
  Init: {
    stateCode: -1010,
    generate: {
      children: '',
      className: '',
      disabled: true,
      icon: null,
    },
    action: {
      children: '开始',
      className: '',
      disabled: false,
      icon: Mic,
    },
  },
  AudioConnecting: {
    stateCode: 1011,
    generate: {
      children: '正在连接语音识别服务器',
      className: 'bg-orange-300 hover:bg-orange-300 flex w-4/5',
      disabled: true,
      icon: Loader,
      iconAnimation: 'animate-spin',
    },
    action: {
      children: '停止连接',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  AudioConnectSuccess: {
    stateCode: 2014,
    generate: {
      children: '请开始提问',
      className: 'bg-green-500 hover:bg-green-500 flex w-4/5',
      disabled: true,
      icon: Ear,
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  // 表示可重试错误
  AudioErrorReTry: {
    stateCode: 40112,
    reTry: true,
    generate: {
      children: '连接语音服务器出错',
      className: 'bg-rose-400 hover:bg-rose-400 flex w-4/5',
      disabled: true,
      icon: ScreenShareOff,
    },
    action: {
      children: '重新连接',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: RotateCw,
    },
  },
  // 表示不可重试错误
  AudioError: {
    stateCode: 5017,
    generate: {
      children: '连接语音服务器出错',
      className: 'bg-rose-300 hover:bg-rose-300 flex w-4/5',
      disabled: true,
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  AIGenerating: {
    stateCode: 1008,
    generate: {
      children: '生成中 点击停止生成',
      className: 'bg-orange-500 hover:bg-orange-600 flex w-4/5',
      disabled: false,
      icon: Loader,
      iconAnimation: 'animate-spin ',
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  AIComplete: {
    stateCode: 2119,
    generate: {
      children: '重新生成',
      className: 'bg-green-500 hover:bg-geeen-600 flex w-4/5',
      disabled: false,
      icon: RotateCw,
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  // 错误，可重新生成
  AIFailed: {
    stateCode: 51110,
    generate: {
      children: '重新生成',
      className: 'bg-rose-500 hover:bg-rose-600 flex w-4/5',
      disabled: false,
      icon: RotateCw,
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
  // 错误，不可重新生成
  AIError: {
    stateCode: 51111,
    generate: {
      children: '生成失败',
      className: 'bg-rose-500 hover:bg-rose-600 flex w-4/5',
      disabled: true,
      icon: Frown,
    },
    action: {
      children: '结束',
      className: 'bg-rose-500 hover:bg-rose-600 w-1/5 absolute right-0 top-0',
      disabled: false,
      icon: Power,
    },
  },
}

export const ModelMap = {
  Aliyun: {
    id: 'alibaba',
    name: '阿里通义千问',
    hostname: 'dashscope.aliyuncs.com',
    pathName: `/api/v1/services/aigc/text-generation/generation?`,
    headers: [
      { key: 'Accept', value: 'text/event-stream' },
      { key: 'Authorization', value: `Bearer ${import.meta.env.VITE_ALIYUN_AI_KEY}` },
    ],
    createBody: (question = '介绍一下你自己') =>
      JSON.stringify({
        model: 'qwen-turbo',
        input: {
          prompt: localStorage.promptPrefix ? localStorage.promptPrefix + question : question,
        },
        parameters: {
          enable_search: true,
          incremental_output: true,
        },
      }),
    valuePath: ['output', 'text'],
  },
}
