'use client'

import { useEffect, useRef, useState } from 'react'
import Quagga from '@ericblade/quagga2'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, X } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  isOpen: boolean
  onClose: () => void
}

export function BarcodeScanner({ onDetected, isOpen, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [detectedCode, setDetectedCode] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const hasDetectedRef = useRef(false)

  const addDebug = (msg: string) => {
    console.log('[Barcode Scanner]', msg)
    setDebugInfo(prev => [...prev, msg])
  }

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when closing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      Quagga.stop()
      setDebugInfo([])
      setError(null)
      setDetectedCode(null)
      hasDetectedRef.current = false
      return
    }

    // Wait for refs to be ready
    const initScanner = () => {
      if (!videoRef.current || !containerRef.current) {
        addDebug('Esperando refs...')
        setTimeout(initScanner, 100)
        return
      }

      addDebug('✓ Refs listos')
      startCamera()
    }

    const startCamera = () => {

      setIsInitializing(true)
      setError(null)
      setDebugInfo([])

      addDebug('Iniciando...')
      addDebug(`isSecureContext: ${window.isSecureContext}`)
      addDebug(`hostname: ${window.location.hostname}`)
      addDebug(`protocol: ${window.location.protocol}`)

      // Check for mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara')
        setIsInitializing(false)
        return
      }

      addDebug('mediaDevices soportado')

      // Request camera permission
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      addDebug('Solicitando permisos...')

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          addDebug('✓ Permisos concedidos')
          addDebug(`Stream tracks: ${stream.getTracks().length}`)
          streamRef.current = stream

          if (!videoRef.current) {
            addDebug('✗ videoRef no disponible')
            return
          }

          addDebug('Asignando stream a video...')

          // Set video properties first
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.setAttribute('autoplay', 'true')
          videoRef.current.setAttribute('muted', 'true')
          videoRef.current.muted = true

          // Assign stream
          videoRef.current.srcObject = stream

          addDebug('Stream asignado, intentando reproducir...')

          // Try to play
          const playPromise = videoRef.current.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                addDebug('✓ Video reproduciendo')
                addDebug(`Video dimensions: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`)
                setIsInitializing(false)

                // Wait for video metadata
                if (videoRef.current) {
                  videoRef.current.onloadedmetadata = () => {
                    addDebug(`✓ Metadata cargada: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`)
                  }
                }

                // Initialize Quagga after video is playing
                setTimeout(() => {
                  if (!containerRef.current) {
                    addDebug('✗ containerRef no disponible')
                    return
                  }

                  addDebug('Inicializando Quagga...')

                  const config = {
                    inputStream: {
                      type: 'LiveStream',
                      target: containerRef.current,
                      constraints: {
                        facingMode: 'environment'
                      }
                    },
                    decoder: {
                      readers: [
                        'ean_reader',
                        'ean_8_reader',
                        'code_128_reader',
                        'code_39_reader',
                        'upc_reader',
                        'upc_e_reader'
                      ]
                    },
                    locate: true,
                    numOfWorkers: 0,
                    frequency: 10
                  }

                  Quagga.init(config as any, (err) => {
                    if (err) {
                      addDebug(`✗ Error Quagga: ${err.message}`)
                      // Don't show error, video is working
                      return
                    }

                    Quagga.start()
                    addDebug('✓ Quagga inicializado')
                  })

                  Quagga.onDetected((result) => {
                    addDebug('Código detectado')
                    if (hasDetectedRef.current) {
                      return // Already processed a code
                    }

                    const code = result.codeResult.code
                    console.log('[Barcode Scanner] 📷 Código detectado:', code)
                    setDebugInfo(prev => [...prev, `📷 Código detectado: ${code}`])

                    if (code && code.length > 0) {
                      hasDetectedRef.current = true
                      setDetectedCode(code)

                      console.log('[Barcode Scanner] ✓ Enviando código al formulario:', code)
                      setDebugInfo(prev => [...prev, `✓ Enviando código: ${code}`])

                      // Call the callback immediately
                      onDetected(code)

                      // Stop scanning
                      Quagga.stop()
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop())
                        streamRef.current = null
                      }

                      // Close after showing success
                      setTimeout(() => {
                        console.log('[Barcode Scanner] Cerrando modal...')
                        onClose()
                      }, 1000)
                    }
                  })
                }, 2000)
              })
              .catch(err => {
                addDebug(`✗ Error play(): ${err.name} - ${err.message}`)
                setError(`Error reproduciendo video: ${err.message}`)
                setIsInitializing(false)
              })
          } else {
            addDebug('✗ play() no retornó Promise')
          }
        })
        .catch((err) => {
          addDebug(`✗ Error getUserMedia: ${err.name} - ${err.message}`)
          setIsInitializing(false)

          if (err.name === 'NotAllowedError') {
            setError('Permiso de cámara denegado. Por favor permite el acceso a la cámara.')
          } else if (err.name === 'NotFoundError') {
            setError('No se encontró ninguna cámara en este dispositivo.')
          } else if (err.name === 'NotReadableError') {
            setError('La cámara está siendo usada por otra aplicación.')
          } else {
            setError(`Error: ${err.message}`)
          }
        })
    }

    // Start initialization
    initScanner()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      Quagga.stop()
    }
  }, [isOpen, onDetected, onClose])

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    Quagga.stop()
    setDetectedCode(null)
    setDebugInfo([])
    setError(null)
    hasDetectedRef.current = false
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div
            ref={containerRef}
            className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              autoPlay
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {!error && !detectedCode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-64 h-32 border-2 border-green-500 rounded-lg shadow-lg" />
              </div>
            )}

            {detectedCode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/90 z-30">
                <div className="text-white text-center">
                  <div className="text-6xl mb-4">✓</div>
                  <p className="text-2xl font-bold mb-2">¡Código Detectado!</p>
                  <p className="text-xl">{detectedCode}</p>
                </div>
              </div>
            )}

            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <p className="text-white text-sm">Iniciando cámara...</p>
              </div>
            )}
          </div>

          {!error && (
            <div className="text-center text-sm text-gray-600">
              Posiciona el código de barras dentro del marco verde
            </div>
          )}

          {/* Debug info - always visible */}
          <div className="text-xs text-gray-500 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
            {debugInfo.length === 0 ? (
              <div className="text-gray-400">Esperando debug info...</div>
            ) : (
              debugInfo.map((info, i) => (
                <div key={i}>{info}</div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
