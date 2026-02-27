import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getDataSource } from '@/lib/db'
import { Quote } from '@/lib/db/entities/quote.entity'
import { QuoteDisplay } from '@/components/quotes/quote-display'
import { getBaseUrl } from '@/lib/utils/url'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function QuotePage({ params }: PageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  const dataSource = await getDataSource()
  const quoteRepo = dataSource.getRepository(Quote)

  // Find quote by access token with all relations
  const quote = await quoteRepo.findOne({
    where: {
      accessToken: token,
    },
    relations: ['items', 'store'],
  })

  if (!quote) {
    notFound()
  }

  // Increment view count and update last viewed
  await quoteRepo.update(
    { id: quote.id },
    {
      viewCount: () => 'view_count + 1',
      lastViewedAt: new Date(),
    }
  )

  // Generate the quote URL using headers to get the actual host
  const headersList = await headers()
  const baseUrl = getBaseUrl({ url: headersList.get('x-url') || `https://${headersList.get('host')}` } as Request)
  const quoteUrl = `${baseUrl}/quote/${token}`

  // Serialize for Client Component
  const serializedQuote = JSON.parse(JSON.stringify(quote))

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <QuoteDisplay
          quote={serializedQuote}
          quoteUrl={quoteUrl}
        />
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { token } = await params

  try {
    const dataSource = await getDataSource()
    const quoteRepo = dataSource.getRepository(Quote)

    const quote = await quoteRepo.findOne({
      where: {
        accessToken: token,
      },
      relations: ['store'],
    })

    if (!quote) {
      return {
        title: 'Presupuesto No Encontrado',
      }
    }

    return {
      title: `Presupuesto ${quote.quoteNumber} - ${quote.store.name}`,
      description: `Presupuesto de ${quote.store.name}`,
    }
  } catch (error) {
    return {
      title: 'Presupuesto',
    }
  }
}
