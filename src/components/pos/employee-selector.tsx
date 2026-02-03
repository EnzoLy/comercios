'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PinPadDialog } from './pin-pad-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveEmployee } from '@/contexts/active-employee-context'
import { useRouter } from 'next/navigation'

interface EmployeeShift {
  id: string
  employeeId: string
  employmentId: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
  employee: {
    id: string
    name: string
  }
}

interface EmployeeSelectorProps {
  storeId: string
  isOpen: boolean
  onClose: () => void
  onEmployeeSelected: (employeeId: string, employeeName: string) => void
}

export function EmployeeSelector({
  storeId,
  isOpen,
  onClose,
  onEmployeeSelected
}: EmployeeSelectorProps) {
  const [shifts, setShifts] = useState<EmployeeShift[]>([])
  const [filteredShifts, setFilteredShifts] = useState<EmployeeShift[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShift, setSelectedShift] = useState<EmployeeShift | null>(null)
  const [showPinPad, setShowPinPad] = useState(false)
  const [requirePin, setRequirePin] = useState(true)
  const { setActiveEmployee } = useActiveEmployee()
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      loadTodayShifts()
      loadSecuritySettings()
      setSearchTerm('')
      setSelectedShift(null)
    }
  }, [isOpen, storeId])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredShifts(shifts)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredShifts(
        shifts.filter(shift =>
          shift.employee.name.toLowerCase().includes(term)
        )
      )
    }
  }, [searchTerm, shifts])

  const loadTodayShifts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/employee-shifts/today`)
      if (!response.ok) throw new Error('Failed to load shifts')
      const data = await response.json()
      setShifts(data || [])
    } catch (error) {
      toast.error('Error al cargar turnos')
      console.error('Error loading shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSecuritySettings = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/security-settings`)
      if (response.ok) {
        const data = await response.json()
        setRequirePin(data.requireEmployeePin ?? true)
      }
    } catch (error) {
      console.error('Error loading security settings:', error)
      // Default to requiring PIN on error
      setRequirePin(true)
    }
  }

  const handleSelectEmployee = async (shift: EmployeeShift) => {
    setSelectedShift(shift)

    // If PIN is not required, switch user immediately
    if (!requirePin) {
      try {
        // Fetch employment details to get role and isOwner
        const empResponse = await fetch(`/api/stores/${storeId}/employments/${shift.employmentId}`)
        if (!empResponse.ok) {
          toast.error('Error al obtener información del empleado')
          return
        }
        const empData = await empResponse.json()

        // Set active employee in context
        setActiveEmployee({
          id: shift.employeeId,
          name: shift.employee.name,
          role: empData.role,
          isOwner: empData.store?.ownerId === shift.employeeId,
        })

        toast.success(`Bienvenido, ${shift.employee.name}!`)
        onEmployeeSelected(shift.employeeId, shift.employee.name)
        onClose()
        router.refresh()
      } catch (error) {
        console.error('Error switching user:', error)
        toast.error('Error al cambiar de usuario')
      }
    } else {
      // Show PIN pad if required
      setShowPinPad(true)
    }
  }

  const handlePinSuccess = async () => {
    if (selectedShift) {
      try {
        // Fetch employment details to get role and isOwner
        const empResponse = await fetch(`/api/stores/${storeId}/employments/${selectedShift.employmentId}`)
        if (!empResponse.ok) {
          toast.error('Error al obtener información del empleado')
          return
        }
        const empData = await empResponse.json()

        // Set active employee in context
        setActiveEmployee({
          id: selectedShift.employeeId,
          name: selectedShift.employee.name,
          role: empData.role,
          isOwner: empData.store?.ownerId === selectedShift.employeeId,
        })

        onEmployeeSelected(selectedShift.employeeId, selectedShift.employee.name)
        setShowPinPad(false)
        onClose()
        router.refresh()
      } catch (error) {
        console.error('Error switching user:', error)
        toast.error('Error al cambiar de usuario')
      }
    }
  }

  const formatTime = (time: string) => {
    if (!time) return '--:--'
    return time.substring(0, 5)
  }

  return (
    <>
      <Dialog open={isOpen && !showPinPad} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Empleado</DialogTitle>
            <DialogDescription>
              Elige el empleado que trabajará en el POS ahora
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            {/* Shifts List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredShifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {shifts.length === 0
                    ? 'No hay turnos programados hoy'
                    : 'No se encontraron empleados'}
                </div>
              ) : (
                filteredShifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => handleSelectEmployee(shift)}
                    className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">
                      {shift.employee.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {shift.type === 'REGULAR' ? 'Turno regular' : 'Turno especial'}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Close Button */}
            <Button onClick={onClose} variant="outline" className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Pad Dialog */}
      {selectedShift && (
        <PinPadDialog
          isOpen={showPinPad}
          employeeName={selectedShift.employee.name}
          employmentId={selectedShift.employmentId}
          storeId={storeId}
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setShowPinPad(false)
            setSelectedShift(null)
          }}
        />
      )}
    </>
  )
}
