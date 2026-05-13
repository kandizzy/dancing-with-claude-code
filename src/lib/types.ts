export type Role = 'user' | 'assistant'

export type Message = {
  role: Role
  text: string
}

export type Chat = {
  id: string
  title: string
  messages: Message[]
}

export type Config = {
  userName: string
  thinkingDelay: number
  streamSpeed: number
}
