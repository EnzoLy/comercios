# ✅ Testing Checklist - Production Deployment

## 📊 Resumen del Sistema de Testing

### Tests Implementados

✅ **Tests E2E (Playwright)** - 40+ test cases
- ✅ Autenticación (10 tests)
- ✅ POS/Punto de Venta (6 tests) - **CRÍTICO**
- ✅ Gestión de Productos (10 tests)
- ✅ Gestión de Inventario (8 tests)

✅ **Tests Unitarios (Vitest)** - 60+ test cases
- ✅ Validaciones de Producto (20 tests)
- ✅ Cálculos de Impuestos (20 tests)

---

## 🚀 Cómo Ejecutar los Tests

### 1. Preparación (Primera vez)

```bash
# Instalar dependencias (ya hecho)
pnpm install

# Crear base de datos de testing (¡SEPARADA de producción!)
createdb commerce_test

# Ejecutar migraciones en DB de test
DATABASE_URL=postgresql://user:pass@localhost:5432/commerce_test pnpm db:migrate

# Crear usuario admin de test
DATABASE_URL=postgresql://user:pass@localhost:5432/commerce_test pnpm db:create-admin
# Email: admin@test.com
# Password: admin123
```

### 2. Ejecutar Tests Unitarios (Rápido - 2 minutos)

```bash
# Ejecutar todos los unit tests
pnpm test:unit

# Ver coverage
pnpm test:coverage
```

**Criterio de éxito:** Todos los tests deben pasar (100% success rate)

### 3. Ejecutar Tests E2E (Completo - 10 minutos)

```bash
# Asegúrate de que el servidor de desarrollo esté corriendo
# En una terminal:
pnpm dev

# En otra terminal, ejecuta los tests E2E:
pnpm test:e2e

# O con interfaz visual (recomendado):
pnpm test:e2e:ui
```

**Criterio de éxito:** Todos los tests deben pasar

---

## 📋 Checklist Manual de Funcionalidades

Además de los tests automatizados, verifica manualmente estos flujos:

### 🔐 1. Autenticación

- [ ] Login con email/password (ADMIN)
- [ ] Login con email/password (MANAGER)
- [ ] Login con email/password (CASHIER) - debe fallar
- [ ] Login con credenciales inválidas muestra error
- [ ] Logout funciona correctamente
- [ ] Redirección después de login funciona
- [ ] Sesión persiste al recargar página
- [ ] Sesión expira después de 30 días

### 🛒 2. POS (Punto de Venta) - **MÁS CRÍTICO**

- [ ] Buscar producto por código de barras funciona
- [ ] Agregar producto al carrito
- [ ] Modificar cantidad de producto en carrito
- [ ] Eliminar producto del carrito
- [ ] Calcular total correctamente
- [ ] Calcular impuestos correctamente (verificar con IVA 16%)
- [ ] Aplicar descuento (porcentaje y monto fijo)
- [ ] Procesar venta con pago en efectivo
- [ ] Procesar venta con tarjeta
- [ ] Calcular cambio correctamente
- [ ] Imprimir ticket de venta
- [ ] Venta actualiza stock correctamente
- [ ] Producto sin stock muestra advertencia
- [ ] POS funciona SIN INTERNET (offline)
- [ ] Ventas offline se sincronizan al reconectar

### 📦 3. Gestión de Productos

- [ ] Crear producto nuevo con todos los campos
- [ ] Editar producto existente
- [ ] Eliminar producto
- [ ] Subir imagen de producto (URL)
- [ ] Subir imagen de producto (archivo)
- [ ] Crear producto con código de barras
- [ ] Crear producto por peso (kg, lb, etc.)
- [ ] Configurar impuesto personalizado por producto
- [ ] Validación de SKU duplicado funciona
- [ ] Validación de código de barras duplicado funciona
- [ ] Búsqueda y filtrado de productos
- [ ] Paginación funciona correctamente
- [ ] Importar productos desde Excel

### 📊 4. Inventario

- [ ] Ver movimientos de stock
- [ ] Filtrar movimientos por tipo
- [ ] Ajustar stock (incremento)
- [ ] Ajustar stock (decremento)
- [ ] Ver alertas de bajo stock
- [ ] Configurar niveles mínimos de stock
- [ ] Crear lote con fecha de vencimiento
- [ ] Ver productos próximos a vencer
- [ ] Recibir alerta de productos vencidos

### 👥 5. Gestión de Empleados

- [ ] Crear nuevo empleado
- [ ] Asignar rol (ADMIN, MANAGER, STOCK_KEEPER, CASHIER)
- [ ] Configurar PIN para POS
- [ ] Generar código QR para acceso
- [ ] Login con QR code funciona
- [ ] Editar permisos de empleado
- [ ] Desactivar empleado

### 💰 6. Turnos de Caja

- [ ] Abrir turno (registrar monto inicial)
- [ ] Realizar ventas durante turno
- [ ] Cerrar turno (cuadre de caja)
- [ ] Calcular diferencia (esperado vs real)
- [ ] Ver historial de turnos
- [ ] Imprimir reporte de cierre de turno

### 🏪 7. Proveedores

- [ ] Crear proveedor
- [ ] Editar información de proveedor
- [ ] Asociar productos con proveedores
- [ ] Ver productos por proveedor

### 📝 8. Órdenes de Compra

- [ ] Crear orden de compra
- [ ] Agregar productos a orden
- [ ] Marcar orden como recibida
- [ ] Actualizar stock al recibir orden
- [ ] Cancelar orden de compra
- [ ] Ver historial de órdenes

### 📈 9. Reportes y Analytics

- [ ] Dashboard muestra métricas correctas
- [ ] Ventas del día se calculan correctamente
- [ ] Productos más vendidos
- [ ] Reporte de ventas por período
- [ ] Reporte de inventario
- [ ] Exportar reportes a Excel/PDF

### ⚙️ 10. Configuración de Tienda

- [ ] Cambiar nombre de tienda
- [ ] Cambiar logo
- [ ] Configurar tasa de impuesto global
- [ ] Configurar moneda
- [ ] Configurar información de contacto
- [ ] Configurar impresora de tickets

---

## 🔍 Testing de Roles y Permisos

Verifica que cada rol solo puede acceder a sus funciones permitidas:

### CASHIER (Cajero)
✅ **Puede:**
- Acceder al POS
- Realizar ventas
- Ver su código QR de acceso

❌ **NO puede:**
- Gestionar productos
- Ver inventario
- Gestionar empleados
- Ver reportes completos

### STOCK_KEEPER (Almacenista)
✅ **Puede:**
- Todo lo de CASHIER +
- Gestionar productos
- Gestionar inventario
- Ver movimientos de stock
- Gestionar categorías

❌ **NO puede:**
- Gestionar empleados
- Ver reportes financieros
- Cambiar configuración de tienda

### MANAGER (Gerente)
✅ **Puede:**
- Todo lo de STOCK_KEEPER +
- Gestionar empleados (excepto ADMIN)
- Ver todos los reportes
- Gestionar proveedores
- Crear órdenes de compra

❌ **NO puede:**
- Cambiar configuración crítica de tienda
- Eliminar la tienda

### ADMIN (Administrador)
✅ **Puede:**
- TODO sin restricciones

---

## 🌐 Testing de Performance

### Tests de Carga

```bash
# Simular 100 usuarios concurrentes en POS
# (Requiere herramientas como k6 o Artillery)
```

**Criterios:**
- [ ] POS responde en < 200ms
- [ ] Búsqueda de productos en < 100ms
- [ ] Procesamiento de venta en < 500ms
- [ ] No hay memory leaks después de 100 ventas
- [ ] Database queries optimizadas (< 50ms por query)

### Tests de Funcionalidad Offline

- [ ] POS carga productos desde cache
- [ ] Ventas se guardan en queue local
- [ ] UI muestra indicador de "sin conexión"
- [ ] Al reconectar, ventas se sincronizan automáticamente
- [ ] No se pierden datos durante desconexión

---

## 🐛 Testing de Casos Edge

### Casos Especiales

- [ ] Venta con cantidad decimal (productos por peso)
- [ ] Venta con descuento del 100% (producto gratis)
- [ ] Producto sin imagen se muestra correctamente
- [ ] Producto sin código de barras se puede buscar por nombre
- [ ] Stock negativo no se permite (excepto en modo admin)
- [ ] Precios con muchos decimales (ej: $0.99999)
- [ ] Nombres de productos muy largos
- [ ] Caracteres especiales en nombres (ñ, á, €, etc.)

### Casos de Error

- [ ] Pérdida de conexión durante venta
- [ ] Error al imprimir ticket
- [ ] Base de datos no disponible
- [ ] Timeout en queries lentos
- [ ] Manejo de errores 500 en API
- [ ] Validación de CORS
- [ ] Protección contra XSS
- [ ] Protección contra SQL Injection

---

## 📱 Testing de Dispositivos

### Browsers

- [ ] Chrome/Edge (último)
- [ ] Firefox (último)
- [ ] Safari (macOS/iOS)

### Dispositivos Móviles

- [ ] Tablet en POS
- [ ] Smartphone (vista administrativa)
- [ ] Orientación portrait y landscape

### Impresoras

- [ ] Impresora térmica 58mm
- [ ] Impresora térmica 80mm
- [ ] Impresora láser (PDF)

---

## ✅ Checklist Pre-Producción

### Configuración

- [ ] Variables de entorno de producción configuradas
- [ ] Database de producción creada y migrada
- [ ] SSL/HTTPS habilitado
- [ ] CORS configurado correctamente
- [ ] Rate limiting configurado
- [ ] Backups automáticos configurados

### Seguridad

- [ ] Passwords hasheados con bcrypt
- [ ] JWT secrets generados correctamente
- [ ] No hay credenciales en el código
- [ ] .env.production no está en git
- [ ] Headers de seguridad configurados
- [ ] Protección CSRF habilitada

### Monitoreo

- [ ] Logs configurados (archivo/servicio)
- [ ] Error tracking configurado (Sentry, etc.)
- [ ] Monitoring de uptime configurado
- [ ] Alertas de errores configuradas
- [ ] Métricas de performance configuradas

### Performance

- [ ] Assets optimizados y minificados
- [ ] Imágenes optimizadas
- [ ] Lazy loading habilitado
- [ ] Service Worker configurado (PWA)
- [ ] CDN configurado (si aplica)

### Testing Final

- [ ] Todos los tests unitarios pasan
- [ ] Todos los tests E2E pasan
- [ ] Testing manual completado
- [ ] Testing de carga realizado
- [ ] Testing de seguridad realizado

---

## 📝 Reporte de Resultados

### Ejecuta esta Suite Completa

```bash
# 1. Tests unitarios
pnpm test:unit

# 2. Tests E2E
pnpm test:e2e

# 3. Coverage
pnpm test:coverage
```

### Captura de Resultados

```
=== RESULTADOS DE TESTING ===
Fecha: __________

Unit Tests:
✅ Passed: ____ / ____
❌ Failed: ____
📊 Coverage: ____%

E2E Tests:
✅ Passed: ____ / ____
❌ Failed: ____
⏱️ Duration: ____ minutes

Manual Testing:
✅ Critical Flows: ____
⚠️ Issues Found: ____

Status: ☐ READY FOR PRODUCTION  ☐ NEEDS FIXES
```

---

## 🎯 Criterios de Aceptación para Producción

El sistema está listo para producción cuando:

1. ✅ **100% de tests automatizados pasan**
2. ✅ **Todos los flujos críticos verificados manualmente**
3. ✅ **POS funciona correctamente offline**
4. ✅ **Roles y permisos validados**
5. ✅ **Performance acceptable** (< 200ms response time)
6. ✅ **No hay errores en consola del browser**
7. ✅ **No hay memory leaks**
8. ✅ **Backups configurados**
9. ✅ **SSL/HTTPS funcionando**
10. ✅ **Monitoreo y alertas activos**

---

## 🆘 Troubleshooting

### Tests E2E Fallan

```bash
# Ver capturas de pantalla de failures
ls playwright-report/screenshots/

# Ver videos de failures
ls playwright-report/videos/

# Ejecutar en modo debug
pnpm test:e2e:debug
```

### Tests Unitarios Fallan

```bash
# Ejecutar con más detalle
pnpm test:unit --reporter=verbose

# Ejecutar solo un archivo específico
pnpm vitest tests/unit/lib/tax-utils.test.ts
```

### Base de Datos de Testing

```bash
# Resetear DB de test
dropdb commerce_test && createdb commerce_test
DATABASE_URL=postgresql://user:pass@localhost:5432/commerce_test pnpm db:migrate
```

---

¡Buena suerte con el deployment! 🚀
