import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <FileQuestion className="h-6 w-6" />
            <CardTitle>Página no Encontrada</CardTitle>
          </div>
          <CardDescription>
            La página que buscas no existe o ha sido movida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
