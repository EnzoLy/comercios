'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { SupplierImportDialog } from './supplier-import-dialog'

interface SupplierImportButtonProps {
  storeId: string
}

export function SupplierImportButton({ storeId }: SupplierImportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Importar
      </Button>
      <SupplierImportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        storeId={storeId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
