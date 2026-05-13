'use client'

import { useRouter } from 'next/navigation'
import { Greeting, InputBar } from '@/components/chat'
import { useChatStore } from '@/lib/chat-store'

export default function NewChat() {
  const { config, models, model, setModel, createChat } = useChatStore()
  const router = useRouter()

  const handleSend = (text: string) => {
    const id = createChat(text)
    router.push(`/chat/${id}`)
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
      <Greeting name={config.userName} />
      <div className="w-full max-w-[var(--input-max-width)]">
        <InputBar
          placeholder="How can I help you today?"
          models={models}
          model={model}
          onModelChange={setModel}
          onSend={handleSend}
        />
      </div>
    </main>
  )
}
