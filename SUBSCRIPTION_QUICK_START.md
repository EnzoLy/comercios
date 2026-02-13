# Quick Start: Sistema de Suscripción

## ✅ Checklist de Implementación

Sigue estos pasos en orden para poner en marcha el sistema de suscripciones.

---

## Paso 1: Ejecutar Migración SQL ⚠️ REQUERIDO

### Opción Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Click en "SQL Editor" en el menú lateral
3. Click en "New Query"
4. Abre el archivo `add-subscription-management.sql`
5. Copia todo el contenido
6. Pega en el editor de Supabase
7. Click en "Run" o presiona `Ctrl+Enter`

**Verificación:**
Deberías ver mensajes de éxito y al final las queries de verificación mostrarán las nuevas columnas.

---

## Paso 2: Configurar CRON_SECRET ⚠️ REQUERIDO

### Local Development

1. Genera un secret:
```bash
openssl rand -base64 32
```

2. Copia el resultado

3. Abre tu archivo `.env` (o `.env.local`)

4. Agrega:
```bash
CRON_SECRET="el-secret-que-generaste"
```

### Production (Vercel)

1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Agrega nueva variable:
   - Name: `CRON_SECRET`
   - Value: (el secret que generaste)
   - Environment: Production (y Preview si quieres)
3. Guarda

---

## Paso 3: Instalar Dependencias (Si es necesario)

El sistema usa `date-fns` para formato de fechas. Si no está instalado:

```bash
npm install date-fns
# o
pnpm install date-fns
# o
yarn add date-fns
```

También necesitas `@radix-ui/react-separator`:

```bash
npm install @radix-ui/react-separator
# o
pnpm install @radix-ui/react-separator
```

---

## Paso 4: Reiniciar el Servidor de Desarrollo

```bash
# Detener el servidor actual (Ctrl+C)
# Luego reiniciar:
npm run dev
# o
pnpm dev
```

---

## Paso 5: Verificar que Todo Funciona

### Test 1: Acceder al Admin Panel

1. Asegúrate de tener un usuario con rol `SUPER_ADMIN`
   - Si no tienes uno, ejecuta:
   ```bash
   pnpm db:create-admin
   ```

2. Inicia sesión con ese usuario

3. Navega a `/admin/stores`

4. **Deberías ver:**
   - ✅ 5 tarjetas de estadísticas en la parte superior
   - ✅ Columna "Suscripción" en la tabla
   - ✅ Columna "Expira" en la tabla
   - ✅ Botones $ (Registrar Pago) y ⚙️ (Gestionar)

### Test 2: Verificar Estados Iniciales

En la tabla de tiendas, todas deberían mostrar:
- Badge verde "Active"
- Fecha de expiración ~90 días en el futuro

### Test 3: Registrar un Pago de Prueba

1. Click en el botón $ de cualquier tienda
2. Llena el formulario:
   ```
   Monto: 50
   Moneda: USD
   Método: Transferencia Bancaria
   Fecha: (hoy)
   Duración: 3 meses
   ```
3. Click "Registrar Pago"
4. Deberías ver toast de éxito
5. La tabla se actualiza automáticamente

### Test 4: Ver Historial de Pagos

1. Click en el botón ⚙️ de la misma tienda
2. **Deberías ver:**
   - Estado actual
   - Fecha de expiración
   - Sección de renovación
   - Tabla con el pago que acabas de registrar

---

## Paso 6: Configurar Cron Job

### Opción A: Vercel Cron (Más Fácil)

1. Crea `vercel.json` en la raíz del proyecto:

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

2. Commit y push a Git

3. Vercel detectará automáticamente el cron

### Opción B: Probar Manualmente (Para Testing)

```bash
# Desde tu terminal
curl -X GET http://localhost:3000/api/cron/update-subscriptions \
  -H "Authorization: Bearer TU_CRON_SECRET_AQUI"
```

Si funciona, deberías ver:
```json
{
  "success": true,
  "results": {
    "total": 1,
    "updated": 1,
    ...
  }
}
```

---

## ✨ ¡Listo!

Si todos los tests pasaron, el sistema está funcionando correctamente.

---

## 🎯 Uso Diario

### Para Registrar Pagos

1. `/admin/stores`
2. Buscar tienda
3. Click $ (Registrar Pago)
4. Llenar formulario
5. ✅ Listo

### Para Ver Historial

1. `/admin/stores`
2. Click ⚙️ (Gestionar)
3. Scroll a "Historial de Pagos"

### Para Renovar Rápidamente

1. `/admin/stores`
2. Click ⚙️ (Gestionar)
3. Sección "Renovar Suscripción"
4. Ingresar meses o años
5. Click "Renovar"

### Para Marcar como Permanente

1. `/admin/stores`
2. Click ⚙️ (Gestionar)
3. Click "Marcar como Permanente"

---

## 🚨 Troubleshooting Común

### "Cannot find module 'date-fns'"
```bash
pnpm install date-fns
```

### "Cannot find module '@radix-ui/react-separator'"
```bash
pnpm install @radix-ui/react-separator
```

### Las columnas de suscripción no aparecen en la tabla
- Verificar que ejecutaste la migración SQL
- Verificar que no hay errores en la consola del navegador
- Refrescar la página (Ctrl+R)

### "Unauthorized" al probar cron
- Verificar que `CRON_SECRET` está en `.env`
- Verificar que usaste el mismo secret en el header
- Reiniciar el servidor de desarrollo

### Tienda aparece expirada cuando debería estar activa
- Ejecutar el cron manualmente
- Verificar `subscription_end_date` en base de datos
- Verificar que la fecha actual es menor a la fecha de expiración

---

## 📚 Documentación Completa

Para información detallada, consulta:
- `SUBSCRIPTION_SYSTEM.md` - Documentación completa
- `SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md` - Resumen de implementación

---

## 🎉 ¡Éxito!

El sistema está listo. Disfruta de tu nuevo sistema de gestión de suscripciones.
