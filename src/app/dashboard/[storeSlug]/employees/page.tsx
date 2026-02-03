'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingPage } from '@/components/ui/loading'
import { UserPlus, Users, Crown, Shield, User } from 'lucide-react'

interface Employment {
  id: string
  userId: string
  role: string
  isActive: boolean
  startDate: string
  endDate?: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function EmployeesPage() {
  const store = useStore()
  const router = useRouter()
  const canManage = usePermission('manage_employees')
  const [employees, setEmployees] = useState<Employment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CASHIER')
  const [removingEmployee, setRemovingEmployee] = useState<Employment | null>(null)

  useEffect(() => {
    if (store) {
      loadEmployees()
    }
  }, [store])

  const loadEmployees = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/employees`)
      if (!response.ok) throw new Error('Failed to load employees')

      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      toast.error('Failed to load employees')
      console.error('Load employees error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!store || !email.trim()) return

    setIsInviting(true)

    try {
      const response = await fetch(`/api/stores/${store.storeId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al invitar al empleado')
        return
      }

      toast.success('¡Empleado registrado con éxito!')
      setInviteOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('CASHIER')
      loadEmployees()
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Invite error:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async () => {
    if (!store || !removingEmployee) return

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/employees/${removingEmployee.id}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to remove employee')
        return
      }

      toast.success('Employee removed successfully')
      setRemovingEmployee(null)
      loadEmployees()
      router.refresh()
    } catch (error) {
      toast.error('Failed to remove employee')
      console.error('Remove error:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'MANAGER':
        return <Crown className="h-4 w-4 text-purple-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'MANAGER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (!canManage) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No tienes permiso para gestionar empleados
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando empleados"
        description="Obteniendo lista de empleados..."
        icon={<Users className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  const activeEmployees = employees.filter((e) => e.isActive)
  const inactiveEmployees = employees.filter((e) => !e.isActive)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Empleados</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los miembros de tu equipo y sus roles
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Registrar Empleado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmployees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{inactiveEmployees.length}</div>
          </CardContent>
        </Card>
      </div>

      {activeEmployees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay empleados aún</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
              Registra miembros de equipo para ayudar a gestionar tu tienda
            </p>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Registrar Primer Empleado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Empleados Activos ({activeEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nombre</th>
                    <th className="text-left py-3 px-4">Correo</th>
                    <th className="text-left py-3 px-4">Rol</th>
                    <th className="text-left py-3 px-4">Fecha de Inicio</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <p className="font-medium">{employee.user.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">{employee.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(employee.role)}
                          <Badge variant={getRoleBadgeVariant(employee.role) as any}>
                            {employee.role}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(employee.startDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="default">Activo</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemovingEmployee(employee)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {inactiveEmployees.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Empleados Inactivos ({inactiveEmployees.length})</CardTitle>
            <CardDescription>Antiguos miembros del equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{employee.user.name}</p>
                    <p className="text-sm text-gray-600">{employee.user.email}</p>
                  </div>
                  <Badge variant="secondary">Inactivo</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Empleado</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario directamente para tu tienda.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isInviting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInviting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña Temporal *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isInviting}
              />
              <p className="text-xs text-gray-500">
                Se le pedirá al empleado que cambie esta contraseña al iniciar sesión por primera vez.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select value={role} onValueChange={setRole} disabled={isInviting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador - Acceso total</SelectItem>
                  <SelectItem value="MANAGER">Gerente - Productos, inventario, ventas</SelectItem>
                  <SelectItem value="CASHIER">Cajero - Solo Caja</SelectItem>
                  <SelectItem value="STOCK_KEEPER">Almacenero - Solo Inventario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={isInviting}
            >
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !email.trim() || !name.trim() || !password.trim()}>
              {isInviting ? 'Registrando...' : 'Registrar Empleado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog
        open={!!removingEmployee}
        onOpenChange={(open) => !open && setRemovingEmployee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Empleado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {removingEmployee?.user.name} de tu tienda?
              Perderá el acceso de inmediato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
