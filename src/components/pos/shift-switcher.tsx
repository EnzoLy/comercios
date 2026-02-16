'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Clock, AlertCircle } from 'lucide-react'
import { PinPadDialog } from './pin-pad-dialog'
import { OwnerPinDialog } from '@/components/auth/owner-pin-dialog'
import { SetOwnerPinDialog } from '@/components/auth/set-owner-pin-dialog'
import { useActiveEmployee } from '@/contexts/active-employee-context'
import { useSecuritySettings } from '@/hooks/use-security-settings'
import { useEmployeeShifts } from '@/hooks/use-employee-shifts'

interface Shift {
  id: string
  startTime: string
  endTime?: string
  notes?: string
  type?: 'REGULAR' | 'SPECIAL'
  employee?: {
    id: string
    name: string
  } | null
  employeeId?: string
  employmentId?: string | null
}

interface ShiftSwitcherProps {
  storeId: string
  currentShift?: Shift | null
  onShiftChange?: (shift: Shift) => void
}

export function ShiftSwitcher({
  storeId,
  currentShift,
  onShiftChange,
}: ShiftSwitcherProps) {
  const { activeEmployee, setActiveEmployee, clearImpersonation } = useActiveEmployee()
  const { data: session } = useSession()
  const router = useRouter()

  // SWR hooks for data fetching with caching
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('activeUserId') : null
  const { shifts = [], isLoading } = useEmployeeShifts(storeId, activeUserId)
  const { securitySettings } = useSecuritySettings(storeId)

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isSwitching, setIsSwitching] = useState(false)
  const [pinPadOpen, setPinPadOpen] = useState(false)
  const [showOwnerPinDialog, setShowOwnerPinDialog] = useState(false)
  const [showSetOwnerPinDialog, setShowSetOwnerPinDialog] = useState(false)

  const requirePin = securitySettings?.requireEmployeePin ?? true

  // Calculate countdown for current shift
  useEffect(() => {
    if (!currentShift?.endTime) {
      setTimeRemaining('')
      return
    }

    const calculateTimeRemaining = () => {
      const now = new Date()
      const [endHour, endMinute] = currentShift.endTime!.split(':').map(Number)

      const endTime = new Date()
      endTime.setHours(endHour, endMinute, 0, 0)

      const diff = endTime.getTime() - now.getTime()

      // If time already passed today, show "Listo para cambiar de turno"
      if (diff < 0) {
        setTimeRemaining('Listo para cambiar')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [currentShift?.endTime])

  const handleSwitchClick = (shift: Shift) => {
    setSelectedShift(shift)
  }

  const handleConfirmSwitch = async () => {
    if (!selectedShift) return

    const isEmployeeChange =
      currentShift?.employeeId !== selectedShift.employeeId

    // Check if switching to owner's shift (no employee or employee is owner)
    const isOwnerShift = !selectedShift.employee?.id || selectedShift.employee?.id === session?.user?.id

    // If currently impersonating and switching to owner shift, require owner PIN
    if (isEmployeeChange && activeEmployee && isOwnerShift) {
      setShowOwnerPinDialog(true)
      return
    }

    if (isEmployeeChange && selectedShift.employee?.id) {
      // Check if PIN is required
      if (requirePin) {
        // Show PIN pad for validation
        setPinPadOpen(true)
      } else {
        // No PIN required, switch directly
        handlePinValidated()
      }
    } else {
      // Same employee, just different shift time
      onShiftChange?.(selectedShift)
      toast.success(`Turno cambiado a ${selectedShift.startTime}`)
      setShowConfirmation(false)
      setSelectedShift(null)
    }
  }

  const handlePinValidated = async () => {
    if (!selectedShift?.employee?.id) return

    setIsSwitching(true)
    setPinPadOpen(false)

    try {
      // Ensure we have an employment ID
      const empId = selectedShift.employmentId
      if (!empId) {
        toast.error('No se encontró información de empleo para este turno')
        setIsSwitching(false)
        return
      }

      // Fetch employment details to get role and isOwner
      const empResponse = await fetch(`/api/stores/${storeId}/employments/${empId}`)
      if (!empResponse.ok) {
        toast.error('Error al obtener información del empleado')
        setIsSwitching(false)
        return
      }
      const empData = await empResponse.json()

      // Set active employee in context
      setActiveEmployee({
        id: selectedShift.employee.id,
        name: selectedShift.employee.name,
        role: empData.role,
        isOwner: empData.store?.ownerId === selectedShift.employee.id,
      })

      toast.success(`Cambio exitoso a: ${selectedShift.employee.name}`)

      // Reload to refresh UI
      setTimeout(() => {
        router.refresh()
        setIsSwitching(false)
        setShowConfirmation(false)
        setSelectedShift(null)
      }, 500)
    } catch (error) {
      console.error('Error switching employee:', error)
      toast.error('Error al cambiar de usuario')
      setIsSwitching(false)
    }
  }

  const handleOwnerReturnToShift = () => {
    // When owner returns from impersonation via PIN verification
    setShowOwnerPinDialog(false)
    setShowSetOwnerPinDialog(false)

    // Reload to refresh UI
    setTimeout(() => {
      router.refresh()
      setShowConfirmation(false)
      setSelectedShift(null)
    }, 300)
  }

  // Show button if there are shifts available
  const canSwitch = shifts.length > 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!canSwitch) {
            toast.error('No hay turnos asignados')
            return
          }
          setShowConfirmation(true)
        }}
        disabled={false}
        className={`${currentShift?.endTime
          ? timeRemaining === 'Cambiar Turno'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 animate-pulse'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200'
          : ''
          } ${canSwitch ? '' : 'opacity-50'}`}
        style={!currentShift?.endTime ? { borderColor: 'var(--color-primary)' } : undefined}
        title={canSwitch ? "Cambiar de turno" : "No hay turnos asignados"}
      >
        <Clock className="h-4 w-4 mr-2" />
        {timeRemaining || 'Cambiar Turno'}
      </Button>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Cambiar Turno
            </DialogTitle>
            <DialogDescription>
              {currentShift && (activeEmployee?.name || session?.user?.name)
                ? `Usuario actual: ${activeEmployee?.name || session?.user?.name} (${currentShift.startTime}${currentShift.endTime ? ` - ${currentShift.endTime}` : ''})`
                : 'Selecciona un nuevo turno'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {shifts.map((shift) => {
              const isCurrentShift =
                currentShift?.id === shift.id
              const employeeName =
                shift.employee?.name || 'Sin nombre'
              const shiftTime = `${shift.startTime}${shift.endTime ? ` - ${shift.endTime}` : ''}`

              return (
                <Button
                  key={shift.id}
                  variant={selectedShift?.id === shift.id ? 'default' : 'outline'}
                  className="w-full justify-start h-auto flex-col items-start p-3"
                  onClick={() => handleSwitchClick(shift)}
                  disabled={isCurrentShift || isSwitching}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{employeeName}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {shiftTime}
                      </span>
                    </div>
                    {isCurrentShift && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                        Actual
                      </span>
                    )}
                  </div>
                  {shift.notes && (
                    <p className="text-xs text-gray-500 mt-1">{shift.notes}</p>
                  )}
                </Button>
              )
            })}
          </div>



          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmation(false)
                setSelectedShift(null)
              }}
              disabled={isSwitching}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSwitch}
              disabled={!selectedShift || isSwitching}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSwitching
                ? 'Cambiando usuario...'
                : currentShift?.employeeId !== selectedShift?.employeeId
                  ? 'Cambiar Usuario'
                  : 'Confirmar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Pad Dialog - para cambio de empleado */}
      {selectedShift && selectedShift.employee && (
        <PinPadDialog
          isOpen={pinPadOpen}
          employeeName={selectedShift.employee.name}
          employmentId={selectedShift.employmentId || ''}
          storeId={storeId}
          onSuccess={handlePinValidated}
          onCancel={() => setPinPadOpen(false)}
        />
      )}

      {/* Owner PIN Dialog - para volver a owner */}
      <OwnerPinDialog
        isOpen={showOwnerPinDialog}
        userName={session?.user?.name || 'Propietario'}
        onSuccess={() => {
          clearImpersonation()
          toast.success('Bienvenido de vuelta')
          handleOwnerReturnToShift()
        }}
        onNoPin={() => {
          setShowOwnerPinDialog(false)
          setShowSetOwnerPinDialog(true)
        }}
        onCancel={() => setShowOwnerPinDialog(false)}
      />

      {/* Set Owner PIN Dialog - para configurar PIN */}
      <SetOwnerPinDialog
        isOpen={showSetOwnerPinDialog}
        userName={session?.user?.name || 'Propietario'}
        onSuccess={() => {
          clearImpersonation()
          toast.success('PIN configurado. Bienvenido de vuelta')
          handleOwnerReturnToShift()
        }}
        onCancel={() => setShowSetOwnerPinDialog(false)}
      />
    </>
  )
}
