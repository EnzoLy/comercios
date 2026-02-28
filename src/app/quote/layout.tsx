import { ForceLightMode } from '@/components/quotes/force-light-mode'

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Runs synchronously before content renders — no dark-mode flash */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove('dark');`,
        }}
      />
      <ForceLightMode />
      {children}
    </>
  )
}
