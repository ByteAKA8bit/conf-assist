// 状态码 xxxx 第一位表示状态 第二位表示generate按钮是否可用 第三位表示action按钮是否可用 第四位往后是用于标识不同状态的随机值，不重复

import { Ear, Frown, Loader, Mic, Power, RotateCw, ScreenShareOff } from 'lucide-react'

// 第一位 状态 1：连接中 2：已成功 3：客户端主动断开 4：客户端错误 5：服务器错误 -1为初始状态
export const ServerState = {
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
      className: 'bg-green-400 hover:bg-green-400 flex w-4/5',
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
      children: '正在生成中',
      className: 'bg-orange-300 hover:bg-orange-300 flex w-4/5',
      disabled: true,
      icon: Loader,
      iconAnimation: 'animate-spin ',
    },
    action: {
      children: '结束',
      className: 'bg-rose-300 hover:bg-rose-300 w-1/5 absolute right-0 top-0',
      disabled: true,
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
  Gemini: {
    id: 'gemini',
    name: '谷歌双子座',
    baseUrl:
      'https://cors-worker.byteaka8bit.workers.dev/v1beta/models/gemini-pro:streamGenerateContent',
    pathName: `alt=sse&key=${import.meta.env.VITE_GOOGLE_AI_STUIDO_KEY}`,
    headers: [{ key: 'Cache-Control', value: 'no-cache' }],
    createBody: (question = '介绍一下你自己') =>
      JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: question,
              },
            ],
          },
        ],
      }),
    valuePath: ['candidates', 0, 'content', 'parts', 0, 'text'],
  },
  Aliyun: {
    id: 'alibaba',
    name: '阿里通义千问',
    baseUrl:
      'https://cors-worker.byteaka8bit.workers.dev/api/v1/services/aigc/text-generation/generation',
    pathName: ``,
    headers: [
      { key: 'Accept', value: 'text/event-stream' },
      { key: 'Authorization', value: `Bearer ${import.meta.env.VITE_ALIYUN_AI_KEY}` },
    ],
    createBody: (question = '介绍一下你自己') =>
      JSON.stringify({
        model: 'qwen-turbo',
        input: {
          prompt: question,
        },
        parameters: {
          enable_search: true,
          incremental_output: true,
        },
      }),
    valuePath: ['output', 'text'],
  },
  Baidu: {
    id: 'baidu',
    name: '百度文心一言',
    baseUrl:
      'https://cors-worker.byteaka8bit.workers.dev/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    pathName: `access_token=${localStorage.baiduAccessToken}`,
    headers: [],
    accessTokenUrl: 'https://cors-worker.byteaka8bit.workers.dev/oauth/2.0/token',
    createBody: (question = '介绍一下你自己') =>
      JSON.stringify({
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
        stream: true,
      }),
    valuePath: ['result'],
  },
}
