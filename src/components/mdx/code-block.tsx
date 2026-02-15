'use client'

interface CodeBlockProps {
  language?: string
  title?: string
  children: React.ReactNode
}

export function CodeBlock({ language, title, children }: CodeBlockProps) {
  return (
    <div className="my-6">
      {title && (
        <div className="bg-muted/50 border border-border border-b-0 rounded-t-2xl px-4 py-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
      )}
      <div className={`relative overflow-x-auto ${title ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
        <pre className={`bg-muted/30 border border-border p-4 ${title ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
          <code className={language ? `language-${language}` : ''}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  )
}
