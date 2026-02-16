import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Registro Deshabilitado</CardTitle>
          <CardDescription className="text-center">
            El auto-registro está deshabilitado en este sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Para obtener acceso a una tienda, debes contactar al administrador del sistema.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              El administrador creará tu cuenta y te proporcionará las credenciales de acceso.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Link href="/auth/signin" className="w-full">
            <Button className="w-full">
              Ir a Iniciar Sesión
            </Button>
          </Link>
          <div className="text-xs text-center text-muted-foreground">
            Si ya tienes una cuenta creada por el administrador, puedes iniciar sesión directamente
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
