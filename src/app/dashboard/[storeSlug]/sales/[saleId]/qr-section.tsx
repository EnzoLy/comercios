'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'

interface QRSectionProps {
  invoiceUrl: string | null
}

export function QRSection({ invoiceUrl }: QRSectionProps) {
  if (!invoiceUrl) return null

  return (
    <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl shadow-slate-950/5 print:shadow-none print:bg-white print:p-0">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
          <QRCodeSVG
            value={invoiceUrl}
            size={160}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
            includeMargin={true}
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 justify-center print:text-black">
            Factura Digital <ShieldCheck className="h-3 w-3 text-emerald-500" />
          </p>
          <p className="text-[9px] text-muted-foreground font-bold max-w-[180px] print:text-black">
            Escanee para validar este comprobante en línea.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
