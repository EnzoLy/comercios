# Digital Invoice System - Setup Guide

## Overview
A complete digital invoice system has been implemented for the POS. After each sale, a digital invoice is automatically created with a unique access token and QR code for easy sharing and viewing.

## Installation Steps

### 1. Install Required Package

The `react-to-print` package has been added to `package.json`. Run the following command to install it:

```bash
pnpm install
```

If you encounter issues with the virtual store directory, try:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
pnpm install
```

**Note**: The `qrcode` package is already installed.

### 2. Environment Variables

Ensure your `.env` or `.env.local` file has the `NEXTAUTH_URL` set correctly:

```env
NEXTAUTH_URL="http://localhost:3000"  # For local development
# or
NEXTAUTH_URL="https://yourdomain.com"  # For production
```

This URL is used to generate the invoice links.

## Files Created

### 1. API Routes

**`src/app/api/stores/[storeId]/sales/[saleId]/invoice/route.ts`**
- POST: Create digital invoice for a sale
- GET: Retrieve existing invoice for a sale
- Automatically generates unique access token
- Returns public invoice URL

### 2. Public Invoice Page

**`src/app/invoice/[token]/page.tsx`**
- Public page accessible without authentication
- Shows invoice details with professional layout
- Tracks view count and last viewed date
- Returns 404 for invalid/inactive invoices
- Includes SEO metadata

### 3. Invoice Display Component

**`src/components/invoice/invoice-display.tsx`**
- Client component for rendering invoice
- Professional receipt/invoice design
- QR code generation using `qrcode` library
- Print functionality with `react-to-print`
- PDF download via browser print
- Print-friendly CSS (hides buttons/QR when printing)
- Responsive design for mobile
- All text in Spanish

### 4. Sale Success Dialog

**`src/components/pos/sale-success-dialog.tsx`**
- Shows after successful sale completion
- Displays QR code for invoice
- "Ver Factura Digital" button
- Copy link functionality
- Shows invoice URL

## Modifications to Existing Files

### 1. Sales API Route
**`src/app/api/stores/[storeId]/sales/route.ts`**
- Added `DigitalInvoice` import
- Automatically creates invoice after successful sale
- Returns `invoiceUrl` in sale response
- Non-blocking: sale succeeds even if invoice creation fails

### 2. POS Page
**`src/app/dashboard/[storeSlug]/pos/page.tsx`**
- Added `SaleSuccessDialog` component
- Shows success dialog with invoice after checkout
- Displays QR code and invoice link
- Allows opening invoice in new tab

### 3. Package.json
**`package.json`**
- Added `react-to-print: ^2.15.1` dependency

## Features

### Invoice Display
- ✅ Store name and branding
- ✅ Invoice number (format: INV-XXXXXXXX)
- ✅ Invoice date and time
- ✅ Complete items table with:
  - Product name and SKU
  - Quantity
  - Unit price
  - Subtotal
  - Item discounts
- ✅ Totals section:
  - Subtotal
  - Tax (if applicable)
  - Discount (if applicable)
  - Grand total
- ✅ Payment method
- ✅ QR code for easy sharing (hidden when printing)
- ✅ Professional formatting

### Functionality
- ✅ Public access via unique token (no login required)
- ✅ Print button with optimized print layout
- ✅ PDF download (via browser print dialog)
- ✅ QR code generation for mobile scanning
- ✅ Copy link to clipboard
- ✅ Open in new tab
- ✅ View counter
- ✅ Last viewed timestamp
- ✅ Responsive design
- ✅ Spanish language

### Security
- ✅ 64-character secure random token (SHA-256)
- ✅ Unique token per invoice
- ✅ Can be deactivated if needed (isActive flag)
- ✅ One invoice per sale (unique constraint)

## Usage

### For Store Owners/Cashiers

1. **Complete a Sale**: Use the POS as normal
2. **Success Dialog**: After checkout, a success dialog appears with:
   - QR code for the digital invoice
   - Button to view invoice
   - Copy link button
3. **Share Invoice**:
   - Customer can scan QR code
   - Copy/paste the link
   - Open invoice in new tab

### For Customers

1. **Scan QR Code**: Use phone camera to scan
2. **Visit Link**: Opens invoice in browser
3. **View Invoice**: Professional invoice display
4. **Print/Download**: Use buttons to print or save as PDF

### API Usage

**Create Invoice for Sale:**
```bash
POST /api/stores/{storeId}/sales/{saleId}/invoice
```

Response:
```json
{
  "id": "uuid",
  "saleId": "uuid",
  "storeId": "uuid",
  "accessToken": "64-char-token",
  "invoiceNumber": "INV-ABCD1234",
  "viewCount": 0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "invoiceUrl": "https://yourdomain.com/invoice/token"
}
```

**Get Existing Invoice:**
```bash
GET /api/stores/{storeId}/sales/{saleId}/invoice
```

**Public Invoice View:**
```bash
GET /invoice/{token}
```

## Database Schema

The `DigitalInvoice` entity includes:
- `id`: UUID primary key
- `saleId`: UUID (unique, one invoice per sale)
- `storeId`: UUID
- `accessToken`: 64-character secure token (unique)
- `invoiceNumber`: Optional display number
- `viewCount`: Number of times viewed
- `lastViewedAt`: Timestamp of last view
- `isActive`: Boolean flag to enable/disable
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Customization

### Styling
Modify `src/components/invoice/invoice-display.tsx` to customize:
- Colors and branding
- Layout and spacing
- Font sizes
- Logo placement

### Invoice Number Format
Change in `src/app/api/stores/[storeId]/sales/[saleId]/invoice/route.ts`:
```typescript
invoiceNumber: `INV-${sale.id.substring(0, 8).toUpperCase()}`
```

### QR Code Settings
Adjust in invoice-display.tsx and sale-success-dialog.tsx:
```typescript
QRCode.toDataURL(url, {
  width: 200,        // Size
  margin: 1,         // Margin
  color: {
    dark: '#000000', // QR color
    light: '#FFFFFF' // Background
  }
})
```

## Testing

1. **Create a Sale**: Complete a sale in the POS
2. **Check Success Dialog**: Verify QR code and invoice link appear
3. **Open Invoice**: Click "Ver Factura Digital"
4. **Test QR Code**: Scan with phone to verify it works
5. **Test Print**: Click print button and verify layout
6. **Test PDF**: Use download button to save as PDF
7. **Verify Tracking**: Refresh invoice page and check view count

## Troubleshooting

### Package Installation Issues
If `pnpm install` fails with virtual store directory error:
```bash
# Delete node_modules
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### QR Code Not Showing
- Check browser console for errors
- Verify `qrcode` package is installed
- Check that `invoiceUrl` is valid

### Invoice Not Found (404)
- Verify invoice was created (check database)
- Check access token is correct
- Ensure invoice `isActive = true`

### Print Layout Issues
- Check print preview in browser
- Verify `@media print` styles are applied
- Test in different browsers

### URL Issues
- Verify `NEXTAUTH_URL` is set correctly
- Check that URL is accessible from customer devices
- For production, use HTTPS

## Future Enhancements

Potential improvements:
- [ ] Email invoice to customer
- [ ] SMS with invoice link
- [ ] Store logo upload and display
- [ ] Custom invoice templates
- [ ] Invoice history page for customers
- [ ] Bulk invoice download
- [ ] Invoice analytics (views, downloads)
- [ ] Refund/void invoice functionality
- [ ] Multi-language support
- [ ] Tax compliance features (fiscal printer integration)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for errors
3. Verify all dependencies are installed
4. Check environment variables are set correctly
