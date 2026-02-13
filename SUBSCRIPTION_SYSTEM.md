# Sistema de Suscripción Manual

## Descripción General

El sistema de suscripción permite gestionar el acceso de las tiendas mediante pagos manuales registrados por el administrador. No incluye procesamiento automático de pagos, sino un sistema de registro manual y control de acceso basado en fechas de expiración.

## Características

- ✅ Registro manual de pagos de suscripción
- ✅ Configuración flexible de duración (meses, años, o permanente)
- ✅ Estados de suscripción: Activa, Por Vencer, Expirada, Permanente
- ✅ Alertas automáticas de expiración (7 días antes)
- ✅ Bloqueo automático de acceso al expirar
- ✅ Historial completo de pagos
- ✅ Dashboard de estadísticas
- ✅ Cron job para actualización diaria de estados

## Instalación

### 1. Ejecutar Migración SQL

Ejecuta el script de migración para agregar las tablas y columnas necesarias:

```bash
# Conecta a tu base de datos Supabase o PostgreSQL y ejecuta:
psql -h [HOST] -U [USER] -d [DATABASE] -f add-subscription-management.sql
```

O desde Supabase Dashboard → SQL Editor → Ejecutar el contenido de `add-subscription-management.sql`

### 2. Configurar Variables de Entorno

Agrega la siguiente variable a tu archivo `.env`:

```bash
# Generar secret con: openssl rand -base64 32
CRON_SECRET="tu-secret-generado-aqui"
```

### 3. Configurar Cron Job

El sistema requiere un cron job que ejecute diariamente el endpoint de actualización de estados.

#### Opción A: Vercel Cron (Recomendado para deploy en Vercel)

Crea `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-subscriptions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Agrega la variable de entorno `CRON_SECRET` en Vercel Dashboard.

#### Opción B: GitHub Actions

Crea `.github/workflows/update-subscriptions.yml`:

```yaml
name: Update Subscription Status

on:
  schedule:
    - cron: '0 0 * * *' # Diariamente a las 00:00 UTC

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Call Update Endpoint
        run: |
          curl -X GET https://tu-dominio.com/api/cron/update-subscriptions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Agrega `CRON_SECRET` a los secrets del repositorio.

#### Opción C: Servicio Externo (cron-job.org, etc.)

1. Registra tu aplicación en un servicio de cron jobs
2. Configura URL: `https://tu-dominio.com/api/cron/update-subscriptions`
3. Método: GET
4. Headers: `Authorization: Bearer TU_CRON_SECRET`
5. Frecuencia: Diario a las 00:00

## Uso del Sistema

### Acceso al Panel de Administración

El panel de gestión de suscripciones está disponible en:

```
/admin/stores
```

Solo accesible para usuarios con rol `SUPER_ADMIN`.

### Estados de Suscripción

| Estado | Descripción | Color |
|--------|-------------|-------|
| **ACTIVE** | Suscripción vigente, más de 7 días restantes | Verde |
| **EXPIRING_SOON** | 7 días o menos hasta la expiración | Amarillo |
| **EXPIRED** | Fecha de expiración pasada | Rojo |
| **PERMANENT** | Suscripción permanente, nunca expira | Azul |

### Registrar un Pago

1. Ir a `/admin/stores`
2. Localizar la tienda en la tabla
3. Click en el botón con ícono de dólar ($)
4. Llenar el formulario:
   - **Monto**: Cantidad pagada
   - **Moneda**: USD, EUR, MXN, COP, etc.
   - **Método de Pago**: Efectivo, Transferencia, Cheque, etc.
   - **Fecha de Pago**: Fecha del pago
   - **Número de Referencia**: (Opcional) Referencia del pago
   - **Duración**: Meses o años de cobertura
   - **Permanente**: Checkbox para marcar como suscripción permanente
   - **Notas**: (Opcional) Notas adicionales
5. Click en "Registrar Pago"

**Comportamiento:**
- Si la suscripción está vigente: se extiende desde la fecha de expiración actual
- Si la suscripción expiró: se inicia desde hoy
- Si se marca como permanente: no tiene fecha de expiración

### Gestionar Suscripción

1. Ir a `/admin/stores`
2. Click en el botón con ícono de engranaje (⚙️)
3. El diálogo muestra:
   - Estado actual de suscripción
   - Fecha de expiración
   - Opción para marcar/desmarcar como permanente
   - Formulario de renovación rápida
   - Historial completo de pagos

### Dashboard de Estadísticas

El panel principal muestra 5 tarjetas con estadísticas:

1. **Total Tiendas**: Número total de tiendas
2. **Activas**: Suscripciones vigentes
3. **Por Vencer**: Expiran en 7 días o menos
4. **Expiradas**: Requieren renovación
5. **Permanentes**: Sin fecha de expiración

### Filtros

Usa el selector "Filtrar por suscripción" para filtrar la tabla por estado.

## Control de Acceso

### Bloqueo de Tiendas Expiradas

Cuando una suscripción expira:

1. **Usuarios normales**: No pueden acceder a la tienda
   - Dashboard redirige a `/dashboard/[storeSlug]/subscription-expired`
   - API retorna `403 Forbidden` con `{ subscriptionExpired: true }`

2. **SUPER_ADMIN**: Tiene acceso completo sin restricciones

### Alertas en Selección de Tiendas

En `/dashboard/select-store`, las tiendas muestran alertas visuales:

- **Expirada**: Alerta roja, botón deshabilitado
- **Por Vencer**: Alerta amarilla con días restantes
- **SUPER_ADMIN**: Mensaje azul indicando acceso privilegiado

## APIs Disponibles

### Admin APIs (Solo SUPER_ADMIN)

#### GET /api/admin/stores
Obtiene lista de tiendas con información de suscripción.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Mi Tienda",
    "slug": "mi-tienda",
    "isActive": true,
    "subscription": {
      "status": "ACTIVE",
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-04-01T00:00:00Z",
      "isPermanent": false,
      "daysRemaining": 45
    }
  }
]
```

#### POST /api/admin/subscriptions/record-payment
Registra un pago manual de suscripción.

**Request Body:**
```json
{
  "storeId": "uuid",
  "amount": 50.00,
  "currency": "USD",
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TRX-12345",
  "paymentDate": "2026-02-12",
  "durationMonths": 3,
  "isPermanent": false,
  "notes": "Pago mensual de febrero"
}
```

#### GET /api/admin/subscriptions/[storeId]/history
Obtiene historial de pagos de una tienda.

#### POST /api/admin/subscriptions/[storeId]/renew
Renueva la suscripción extendiendo la fecha de expiración.

**Request Body:**
```json
{
  "durationMonths": 1
}
```

#### PATCH /api/admin/subscriptions/[storeId]/toggle-permanent
Alterna entre suscripción permanente y temporal.

**Request Body:**
```json
{
  "isPermanent": true
}
```

#### GET /api/admin/subscriptions/stats
Obtiene estadísticas agregadas de suscripciones.

**Response:**
```json
{
  "total": 10,
  "active": 6,
  "expiringSoon": 2,
  "expired": 1,
  "permanent": 1
}
```

### Cron API

#### GET /POST /api/cron/update-subscriptions
Actualiza estados de suscripción de todas las tiendas.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-12T00:00:00Z",
  "duration": "1234ms",
  "results": {
    "total": 10,
    "updated": 10,
    "errors": 0,
    "statusChanges": [
      {
        "storeId": "uuid",
        "storeName": "Tienda Demo",
        "oldStatus": "ACTIVE",
        "newStatus": "EXPIRING_SOON"
      }
    ]
  },
  "alerts": {
    "expiringCount": 2,
    "expiredCount": 1,
    "expiringStores": [...]
  }
}
```

## Reglas de Negocio

### Cálculo de Estados

El cron job ejecuta diariamente a las 00:00 y actualiza los estados:

```typescript
if (isPermanent) → PERMANENT
else if (daysRemaining < 0) → EXPIRED
else if (daysRemaining <= 7) → EXPIRING_SOON
else → ACTIVE
```

### Renovación

- **Suscripción vigente**: Extiende desde `subscriptionEndDate`
- **Suscripción expirada**: Inicia desde hoy
- Al renovar, `isPermanent` se establece en `false`

### Suscripción Permanente

- `isPermanent = true`
- `subscriptionEndDate = null`
- `subscriptionStatus = PERMANENT`
- No se valida en middleware
- No se actualiza en cron job

### Trial Inicial

Al ejecutar la migración, las tiendas existentes reciben:
- 90 días de trial desde la fecha de migración
- Estado: ACTIVE
- Tipo: MONTHLY

## Troubleshooting

### El cron job no se ejecuta

1. Verificar que `CRON_SECRET` está configurado en variables de entorno
2. Verificar logs del servicio de cron
3. Probar manualmente:
   ```bash
   curl -X GET https://tu-dominio.com/api/cron/update-subscriptions \
     -H "Authorization: Bearer TU_CRON_SECRET"
   ```

### Estados no se actualizan

1. Verificar que el cron job se ejecuta correctamente
2. Verificar logs del servidor en el horario del cron
3. Ejecutar manualmente el cron endpoint
4. Verificar fechas de `subscriptionEndDate` en la base de datos

### Usuario no puede acceder a tienda paga

1. Verificar estado de suscripción en `/admin/stores`
2. Verificar que el usuario no es SUPER_ADMIN
3. Refrescar caché del navegador
4. Verificar que `subscriptionEndDate` es mayor a la fecha actual

### Pagos no se reflejan

1. Verificar que el pago se registró correctamente (check historial)
2. Verificar que `subscriptionEndDate` se actualizó
3. Verificar que el estado cambió de EXPIRED a ACTIVE
4. Si es permanente, verificar `isPermanent = true`

## Arquitectura Técnica

### Entidades de Base de Datos

**Store (modificada)**
- `subscriptionStatus`: Estado actual
- `subscriptionStartDate`: Inicio de suscripción
- `subscriptionEndDate`: Fecha de expiración
- `isPermanent`: Flag de permanente
- `subscriptionPrice`: Precio (informativo)
- `subscriptionPeriodType`: Tipo de período

**SubscriptionPayment (nueva)**
- Registro de cada pago manual
- Relación con Store y User
- Incluye período cubierto por el pago

### Servicios

**SubscriptionService** (`src/lib/services/subscription.service.ts`)
- `updateSubscriptionStatus()`: Actualiza estado de una tienda
- `recordPayment()`: Registra pago y actualiza suscripción
- `getPaymentHistory()`: Obtiene historial
- `getExpiringStores()`: Tiendas por vencer
- `getSubscriptionStats()`: Estadísticas
- `checkStoreAccess()`: Valida acceso
- `renewSubscription()`: Renueva suscripción
- `togglePermanent()`: Alterna permanente/temporal

### Componentes UI

- `SubscriptionStatusBadge`: Badge con colores por estado
- `RecordPaymentDialog`: Modal para registrar pagos
- `SubscriptionManagementDialog`: Modal de gestión completa

## Mejoras Futuras (Opcional)

- Email notifications (7 días antes, al expirar, al renovar)
- Reportes de ingresos por mes
- Integración con pasarela de pagos (Stripe, PayPal)
- Niveles de suscripción (Basic, Pro, Enterprise)
- Límites por tier (productos, empleados, ventas/mes)
- API webhooks para eventos de suscripción
- Auto-renovación con tarjeta guardada

## Soporte

Para preguntas o problemas:
- Revisar logs del servidor
- Verificar configuración de variables de entorno
- Consultar este documento
- Contactar al equipo de desarrollo
