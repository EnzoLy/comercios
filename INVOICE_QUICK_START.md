# Digital Invoice System - Quick Start

## Installation

Run this command to install the required package:

```bash
pnpm install
```

This will install `react-to-print` which was added to package.json.

## How It Works

### Automatic Invoice Creation

When a sale is completed in the POS:
1. Sale is saved to database
2. Digital invoice is **automatically created**
3. Unique access token is generated
4. Invoice URL is returned: `https://yourdomain.com/invoice/{token}`

### Success Dialog

After checkout, a dialog appears showing:
- ✅ Success message with total
- ✅ QR code (scannable with phone camera)
- ✅ "Ver Factura Digital" button
- ✅ "Copiar Enlace" button
- ✅ Invoice URL display

### Public Invoice Page

The invoice page at `/invoice/{token}` shows:
- Store information (name, address, phone, email)
- Invoice number and date
- Complete items table
- Totals (subtotal, tax, discount, total)
- Payment method
- QR code (hidden when printing)
- Print and Download PDF buttons

## File Structure

```
src/
├── app/
│   ├── api/stores/[storeId]/sales/
│   │   ├── route.ts (modified - auto-creates invoice)
│   │   └── [saleId]/invoice/route.ts (new - invoice API)
│   ├── invoice/[token]/page.tsx (new - public invoice page)
│   └── dashboard/[storeSlug]/pos/page.tsx (modified - adds success dialog)
├── components/
│   ├── invoice/
│   │   └── invoice-display.tsx (new - invoice rendering)
│   └── pos/
│       └── sale-success-dialog.tsx (new - success dialog with QR)
└── lib/db/entities/
    └── digital-invoice.entity.ts (already exists)
```

## Key Features

### For Store Staff
- No extra steps needed
- Invoice created automatically
- Share link or QR with customer
- Open invoice in new tab

### For Customers
- Scan QR code with phone
- No login required
- Professional invoice display
- Print or save as PDF
- Access anytime with link

## Configuration

### Change Base URL

Edit `.env` or `.env.local`:
```env
NEXTAUTH_URL="https://yourdomain.com"
```

### Customize Invoice Number Format

Edit `src/app/api/stores/[storeId]/sales/[saleId]/invoice/route.ts`:
```typescript
invoiceNumber: `INV-${sale.id.substring(0, 8).toUpperCase()}`
// Change to your preferred format
```

### Customize Invoice Appearance

Edit `src/components/invoice/invoice-display.tsx`:
- Colors and fonts
- Layout and spacing
- Logo (when implemented)
- Footer text

## API Endpoints

### Create Invoice (Manual)
```
POST /api/stores/{storeId}/sales/{saleId}/invoice
```
Returns existing invoice or creates new one.

### Get Invoice (Manual)
```
GET /api/stores/{storeId}/sales/{saleId}/invoice
```
Returns invoice for a sale (requires auth).

### View Invoice (Public)
```
GET /invoice/{token}
```
Public page, no auth required.

## Testing Checklist

- [ ] Complete a sale in POS
- [ ] Verify success dialog appears
- [ ] Check QR code displays
- [ ] Click "Ver Factura Digital"
- [ ] Verify invoice displays correctly
- [ ] Test print button
- [ ] Test download PDF
- [ ] Copy link and open in incognito
- [ ] Scan QR code with phone
- [ ] Check mobile responsive design

## Troubleshooting

**"react-to-print" not found**
```bash
pnpm install
```

**QR code not showing**
- Check console for errors
- Verify `qrcode` package installed

**Invoice shows 404**
- Check database for invoice record
- Verify token is correct
- Check `isActive = true`

**Print layout broken**
- Test in different browser
- Check print preview
- Verify CSS @media print rules

## Next Steps

1. Install dependencies: `pnpm install`
2. Test in local environment
3. Update `NEXTAUTH_URL` for production
4. Customize branding/colors
5. Test QR codes with real devices
6. Deploy and test in production

## Support Files

- `DIGITAL_INVOICE_SETUP.md` - Complete documentation
- `package.json` - Updated with react-to-print
- Entity already created: `digital-invoice.entity.ts`

## Production Deployment

Before deploying:
1. ✅ Set `NEXTAUTH_URL` to production domain
2. ✅ Test all invoice features
3. ✅ Verify QR codes work
4. ✅ Check mobile responsiveness
5. ✅ Test print/PDF on different browsers
6. ✅ Ensure HTTPS is enabled
7. ✅ Test with real sales data

The system is now ready to use! 🎉
