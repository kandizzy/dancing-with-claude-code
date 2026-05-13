import { Folder } from 'lucide-react'

export default function Projects() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
      <Folder className="text-text-tertiary size-12" strokeWidth={1.5} />
      <div className="text-center">
        <h1 className="text-text-primary text-lg font-medium">Projects</h1>
        <p className="text-text-tertiary mt-1 text-sm">
          This is a scaffold page.
        </p>
      </div>
    </main>
  )
}
