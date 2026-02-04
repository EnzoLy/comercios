import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getDataSource } from '@/lib/db'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { InvoiceDisplay } from '@/components/invoice/invoice-display'
import { MoreThan } from 'typeorm'
import { getBaseUrl } from '@/lib/utils/url'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function InvoicePage({ params }: PageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  const dataSource = await getDataSource()
  const invoiceRepo = dataSource.getRepository(DigitalInvoice)

  // Find invoice by access token with all relations
  const invoice = await invoiceRepo.findOne({
    where: {
      accessToken: token,
      isActive: true,
    },
    relations: ['sale', 'sale.items', 'store'],
  })

  if (!invoice) {
    notFound()
  }

  // Increment view count and update last viewed
  await invoiceRepo.update(
    { id: invoice.id },
    {
      viewCount: () => 'view_count + 1',
      lastViewedAt: new Date(),
    }
  )

  // Generate the invoice URL using headers to get the actual host
  const headersList = await headers()
  const baseUrl = getBaseUrl({ url: headersList.get('x-url') || `https://${headersList.get('host')}` } as Request)
  const invoiceUrl = `${baseUrl}/invoice/${token}`

  // Serialize for Client Component
  const serializedInvoice = JSON.parse(JSON.stringify(invoice))

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <InvoiceDisplay
          invoice={serializedInvoice}
          invoiceUrl={invoiceUrl}
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
    const invoiceRepo = dataSource.getRepository(DigitalInvoice)

    const invoice = await invoiceRepo.findOne({
      where: {
        accessToken: token,
        isActive: true,
      },
      relations: ['store', 'sale'],
    })

    if (!invoice) {
      return {
        title: 'Factura No Encontrada',
      }
    }

    return {
      title: `Factura ${invoice.invoiceNumber || invoice.id.substring(0, 8)} - ${invoice.store.name}`,
      description: `Factura digital de ${invoice.store.name}`,
    }
  } catch (error) {
    return {
      title: 'Factura Digital',
    }
  }
}
