'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { Download, Printer } from 'lucide-react'

interface InvoiceItem {
  id: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
}

interface InvoiceData {
  id: string
  invoiceNumber?: string
  createdAt: string
  sale: {
    id: string
    paymentMethod: string
    subtotal: number
    tax: number
    discount: number
    total: number
    completedAt?: string
    items: InvoiceItem[]
  }
  store: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
}

interface InvoiceDisplayProps {
  invoice: InvoiceData
  invoiceUrl: string
}

export function InvoiceDisplay({ invoice, invoiceUrl }: InvoiceDisplayProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Both use the browser's print engine which is the most reliable way 
    // to generate a high-quality PDF or physical print from the DOM
    window.print()
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    MOBILE: 'Pago Móvil',
    CREDIT: 'Crédito',
  }

  const formattedDate = new Date(
    invoice.sale.completedAt || invoice.createdAt
  ).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      {/* Action Buttons - Hidden when printing */}
      <div className="flex gap-3 no-print">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* Invoice Content */}
      <div id="invoice-content" className="bg-card text-card-foreground p-8 print:p-0 shadow-sm border border-border rounded-xl print:border-none print:shadow-none mb-8">
        {/* Header */}
        <div className="border-b-2 border-border pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {invoice.store.name}
              </h1>
              {invoice.store.address && (
                <p className="text-sm text-muted-foreground">{invoice.store.address}</p>
              )}
              {invoice.store.phone && (
                <p className="text-sm text-muted-foreground">Tel: {invoice.store.phone}</p>
              )}
              {invoice.store.email && (
                <p className="text-sm text-muted-foreground">Email: {invoice.store.email}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-foreground mb-2">FACTURA</h2>
              {invoice.invoiceNumber && (
                <p className="text-sm text-muted-foreground">
                  No. {invoice.invoiceNumber}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-3 px-2 font-semibold text-foreground">
                  Producto
                </th>
                <th className="text-center py-3 px-2 font-semibold text-foreground w-20">
                  Cant.
                </th>
                <th className="text-right py-3 px-2 font-semibold text-foreground w-28">
                  Precio Unit.
                </th>
                <th className="text-right py-3 px-2 font-semibold text-foreground w-28">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.sale.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3 px-2 text-foreground">
                    <div className="font-medium">{item.productName}</div>
                    {item.productSku && (
                      <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>
                    )}
                    {item.discount > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Descuento: -{formatCurrency(item.discount)}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-3 px-2 text-foreground">
                    {item.quantity}
                  </td>
                  <td className="text-right py-3 px-2 text-foreground">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="text-right py-3 px-2 text-foreground font-medium">
                    {formatCurrency(item.subtotal - item.discount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-between items-start mb-8">
          {/* QR Code */}
          <div>
            <div className="text-center">
              <div className="bg-white p-2 rounded-lg inline-block border-2 border-border shadow-sm">
                <QRCodeSVG
                  value={invoiceUrl}
                  size={120}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Escanea para ver en línea
              </p>
            </div>
          </div>

          {/* Totals */}
          <div className="ml-auto w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2 text-foreground">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.sale.subtotal)}
                </span>
              </div>

              {invoice.sale.tax > 0 && (
                <div className="flex justify-between py-2 text-foreground">
                  <span>Impuesto:</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.sale.tax)}
                  </span>
                </div>
              )}

              {invoice.sale.discount > 0 && (
                <div className="flex justify-between py-2 text-green-600 dark:text-green-400">
                  <span>Descuento:</span>
                  <span className="font-medium">
                    -{formatCurrency(invoice.sale.discount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 border-t-2 border-border text-lg font-bold text-foreground">
                <span>TOTAL:</span>
                <span>{formatCurrency(invoice.sale.total)}</span>
              </div>

              <div className="flex justify-between py-2 text-sm text-muted-foreground border-t border-border">
                <span>Método de pago:</span>
                <span className="font-medium">
                  {paymentMethodLabels[invoice.sale.paymentMethod] || invoice.sale.paymentMethod}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            ¡Gracias por su compra!
          </p>
          <p className="text-xs text-muted-foreground">
            Factura digital generada el {formattedDate}
          </p>
          <p className="text-xs text-muted-foreground mt-2 break-all opacity-70">
            {invoiceUrl}
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden;
          }
          
          /* Only show the invoice content container and its children */
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          
          /* Position everything to the top left */
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }

          /* Force text colors for print */
          #invoice-content .text-foreground,
          #invoice-content h1, 
          #invoice-content h2,
          #invoice-content .font-bold {
            color: black !important;
          }
          
          #invoice-content .text-muted-foreground {
            color: #444 !important;
          }

          /* Ensure borders are visible in print */
          #invoice-content .border,
          #invoice-content .border-b,
          #invoice-content .border-t,
          #invoice-content .border-b-2,
          #invoice-content .border-t-2 {
            border-color: #ddd !important;
          }

          /* Specific fix for QR code container in print */
          #invoice-content .border-border {
            border-color: #ccc !important;
          }

          /* Hide UI elements explicitly */
          .no-print, .print\\:hidden {
            display: none !important;
          }

          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      ` }} />
    </div>
  )
}
