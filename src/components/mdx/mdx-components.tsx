import { Callout } from './callout'
import { VideoEmbed } from './video-embed'
import { ImageZoom } from './image-zoom'
import { StepList, Step } from './step-list'
import { CodeBlock } from './code-block'
import { InfoCard } from './info-card'

export const mdxComponents = {
  // Componentes personalizados
  Callout,
  VideoEmbed,
  ImageZoom,
  StepList,
  Step,
  CodeBlock,
  InfoCard,

  // Override elementos HTML con estilos personalizados
  h1: (props: any) => (
    <h1
      className="text-3xl font-bold mb-4 mt-8 first:mt-0 scroll-mt-20"
      {...props}
    />
  ),
  h2: (props: any) => (
    <h2
      className="text-2xl font-bold mb-3 mt-6 scroll-mt-20"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      className="text-xl font-semibold mb-2 mt-4 scroll-mt-20"
      {...props}
    />
  ),
  h4: (props: any) => (
    <h4
      className="text-lg font-semibold mb-2 mt-3 scroll-mt-20"
      {...props}
    />
  ),
  p: (props: any) => (
    <p className="mb-4 leading-7 text-muted-foreground" {...props} />
  ),
  ul: (props: any) => (
    <ul className="mb-4 ml-6 list-disc space-y-2 [&>li]:text-muted-foreground" {...props} />
  ),
  ol: (props: any) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2 [&>li]:text-muted-foreground" {...props} />
  ),
  li: (props: any) => (
    <li className="leading-7" {...props} />
  ),
  a: (props: any) => (
    <a
      className="text-primary hover:underline font-medium transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
      {...props}
    />
  ),
  code: (props: any) => {
    // Si tiene className, es un bloque de código (procesado por CodeBlock)
    if (props.className) {
      return <code className="text-sm" {...props} />
    }
    // Código inline
    return (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary"
        {...props}
      />
    )
  },
  pre: (props: any) => (
    <pre className="overflow-x-auto" {...props} />
  ),
  table: (props: any) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse border border-border" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="border border-border bg-muted px-4 py-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: any) => (
    <td
      className="border border-border px-4 py-2"
      {...props}
    />
  ),
  hr: (props: any) => (
    <hr className="my-8 border-border" {...props} />
  ),
  strong: (props: any) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: any) => (
    <em className="italic" {...props} />
  )
}
