# 🧪 Finance Module Testing Guide

## Quick Start Testing

### Step 1: Setup Database Tables

**Option A: Via Browser (Recommended)**
1. Navigate to: `/wp-content/plugins/glazieros-app/create-finance-tables.php`
2. You should see: "✅ SUCCESS! Finance database tables created."
3. Verify all 4 tables show "✓ exists"
4. Delete the `create-finance-tables.php` file after use (security)

**Option B: Via Plugin Deactivate/Reactivate**
1. Go to WordPress Admin → Plugins
2. Deactivate "GlazierOS App"
3. Activate "GlazierOS App" again
4. Database tables will be created automatically

---

### Step 2: Access Finance Module

1. Navigate to: **WordPress Admin → GlazierOS**
2. Click the **"Invoices"** tab in the sidebar
3. You should see:
   - Analytics metrics cards (revenue, expenses, profit, outstanding)
   - Empty state: "No Invoices Found"
   - "Create Invoice" button

---

### Step 3: Create Your First Invoice

**Click "New Invoice" button** - Modal should open

**Fill in Customer Details:**
```
Customer Name: John Smith
Customer Email: john@example.com
Customer Phone: 01234 567890
Customer Address: 123 High Street, London, SW1A 1AA
Payment Terms: Net 30
Invoice Date: [auto-filled with today]
Notes: Test invoice for Finance Module
```

**Add Line Items:**

**Item 1:**
- Description: "uPVC Window - White 1200x1000mm"
- Quantity: 3
- Unit Price: 450.00
- VAT Rate: 20

**Item 2:**
- Description: "Installation Fee"
- Quantity: 1
- Unit Price: 200.00
- VAT Rate: 20

**Item 3:** (Click "+ Add Line Item")
- Description: "Delivery Charge"
- Quantity: 1
- Unit Price: 50.00
- VAT Rate: 20

**Verify Calculations Update Real-Time:**
```
Subtotal: £1,600.00
VAT (20%): £320.00
Total: £1,920.00
```

**Click "Create Invoice"**

---

### Step 4: Verify Invoice Created

After clicking "Create Invoice":

**✅ Expected Results:**
1. Modal closes automatically
2. Success notification appears (currently console.log)
3. Invoice appears in table with:
   - Invoice #: **INV-2025-0001**
   - Customer: **John Smith**
   - Date: **[Today's date]**
   - Due Date: **[Today + 30 days]**
   - Amount: **£1,920.00**
   - Balance: **£1,920.00**
   - Status: **draft** (gray badge)
   - Actions: **View | Edit | Send**

---

### Step 5: Test Payment Recording

**Click "Send" button** on the invoice:
- Status should change from **draft** → **sent** (blue badge)
- Actions should now show: **View | Edit | Record Payment**

**Click "Record Payment" button:**
1. Prompt appears: "Enter payment amount:"
2. Enter: **£500.00** (partial payment)
3. Click OK

**✅ Expected Results:**
- Balance updates: **£1,920.00** → **£1,420.00**
- Status changes: **sent** → **partial** (yellow badge)
- Actions still show "Record Payment"

**Record Second Payment:**
1. Click "Record Payment" again
2. Enter: **£1,420.00** (remaining balance)
3. Click OK

**✅ Expected Results:**
- Balance updates: **£1,420.00** → **£0.00**
- Status changes: **partial** → **paid** (green badge)
- "Record Payment" button disappears

---

### Step 6: Test Analytics Dashboard

**After creating invoice and recording payments:**

**Analytics Cards should show:**
```
Revenue:     £1,920.00  (this period)
Expenses:    £0.00      (no expenses yet)
Net Profit:  £1,920.00  (green, positive)
Outstanding: £0.00      (0 Overdue)
```

**Change Date Filter:**
- Select "This Week" → metrics recalculate
- Select "Today" → should include today's invoice
- Select "This Month" → should include invoice

---

### Step 7: Test Search & Filters

**Search:**
1. Type "John" in search box → invoice appears
2. Type "Smith" → invoice appears
3. Type "XYZ" → "No Invoices Found"
4. Clear search → invoice reappears

**Status Filter:**
1. Select "Paid" → invoice appears
2. Select "Draft" → no invoices (we sent it)
3. Select "All Statuses" → invoice appears

---

### Step 8: Test Edit Invoice

**Click "Edit" button:**
1. Modal opens with pre-filled data
2. Change quantity of Item 1: 3 → **5**
3. Watch totals update:
   ```
   Old: £1,920.00
   New: £2,820.00
   ```
4. Click "Update Invoice"

**❗ Note:** If invoice is already "paid", balance_due will NOT update (payments are already recorded). This is correct behavior.

---

### Step 9: Database Verification

**Open Database Tool (phpMyAdmin, Adminer, etc.):**

**Query 1: Check Invoice Post**
```sql
SELECT * FROM wp_posts 
WHERE post_type = 'gos_invoice' 
ORDER BY ID DESC LIMIT 1;
```
✅ Should show: post_title, post_status='publish'

**Query 2: Check Invoice Metadata**
```sql
SELECT meta_key, meta_value 
FROM wp_postmeta 
WHERE post_id = [INVOICE_ID]
ORDER BY meta_key;
```
✅ Should show: _invoice_number, _customer_name, _total_amount, _balance_due, etc.

**Query 3: Check Line Items**
```sql
SELECT * FROM wp_gos_invoice_items 
WHERE invoice_id = [INVOICE_ID];
```
✅ Should show 3 rows with calculated columns (vat_amount, subtotal, total)

**Query 4: Verify Calculations**
```sql
SELECT 
  invoice_id,
  SUM(subtotal) as total_subtotal,
  SUM(vat_amount) as total_vat,
  SUM(total) as grand_total
FROM wp_gos_invoice_items 
WHERE invoice_id = [INVOICE_ID]
GROUP BY invoice_id;
```
✅ Should match UI totals exactly

**Query 5: Check Payment Allocations**
```sql
SELECT * FROM wp_gos_payment_allocations 
WHERE invoice_id = [INVOICE_ID];
```
✅ Should show 2 rows (£500 + £1,420 payments)

**Query 6: Check Transaction Ledger**
```sql
SELECT * FROM wp_gos_transactions 
WHERE post_id = [INVOICE_ID];
```
✅ Should show invoice transaction with amounts

---

## 🐛 Known Issues to Check

### Issue 1: Notification System
**Current Behavior:** Success uses `console.log()`, errors use `alert()`  
**Expected:** Custom toast notifications  
**Test:** Check browser console for success messages

### Issue 2: View Invoice Modal
**Current Behavior:** Shows `alert(JSON.stringify(...))`  
**Expected:** Formatted read-only modal  
**Test:** Click "View" button → raw JSON appears

### Issue 3: Job Linking Dropdown
**Current Behavior:** Shows "-- Select Job (Optional) --" with no options  
**Expected:** List of jobs from Jobs CPT  
**Test:** Create invoice modal → Job dropdown is empty

---

## ✅ Success Criteria Checklist

### Core Functionality
- [ ] Finance Module loads without JavaScript errors
- [ ] Analytics cards display with £0.00 initially
- [ ] "New Invoice" button opens modal
- [ ] Invoice form has all required fields
- [ ] Line items can be added/removed
- [ ] Totals calculate correctly in real-time
- [ ] Invoice saves to database successfully
- [ ] Invoice number auto-generates (INV-2025-0001)
- [ ] Invoice appears in table after creation
- [ ] Status badges display correct colors

### Payment Workflow
- [ ] "Send" button transitions draft → sent
- [ ] "Record Payment" button appears for unpaid invoices
- [ ] Partial payment updates balance correctly
- [ ] Full payment changes status to "paid"
- [ ] Payment allocations save to database
- [ ] Analytics update after payment recorded

### Search & Filter
- [ ] Search input filters invoices (debounced)
- [ ] Status filter works (all, draft, sent, paid, etc.)
- [ ] Date range filter updates analytics
- [ ] Filters can be combined

### Edit & Delete
- [ ] Edit button opens modal with pre-filled data
- [ ] Line items load correctly when editing
- [ ] Updates save and refresh the table
- [ ] Delete button shows confirmation dialog
- [ ] Delete removes invoice from table

### Responsive Design
- [ ] Dashboard looks good on desktop (1920px)
- [ ] Table scrolls horizontally on tablet (768px)
- [ ] Modal resizes for mobile (480px)
- [ ] Touch interactions work on mobile devices

---

## 🔍 Browser Console Checks

**Open Developer Tools (F12) → Console tab**

### On Page Load:
```javascript
✅ "💰 Initializing Finance Module UI..."
✅ "🏦 Finance Module Initializing..."
✅ "✅ Finance Module UI Ready"
✅ "✅ Finance Module Ready"
```

### After Creating Invoice:
```javascript
✅ "Invoice created successfully" (in console)
```

### Check for Errors:
```javascript
❌ No errors about:
   - wpApiSettings undefined
   - jQuery not defined
   - Uncaught TypeError
   - 401 Unauthorized
   - 404 Not Found
```

---

## 🌐 Network Tab Checks

**Open Developer Tools → Network tab**

### Filter: Fetch/XHR

**On Panel Activation:**
```
✅ GET /wp-json/glazieros/v1/finance/analytics
   Status: 200 OK
   Response: { revenue: 0, expenses: 0, net_profit: 0, ... }

✅ GET /wp-json/glazieros/v1/invoices?page=1&per_page=20&status=all
   Status: 200 OK
   Response: []
```

**After Creating Invoice:**
```
✅ POST /wp-json/glazieros/v1/invoices
   Status: 201 Created
   Request Payload: { customer_name: "John Smith", items: [...], ... }
   Response: { id: 123, invoice_number: "INV-2025-0001", ... }

✅ GET /wp-json/glazieros/v1/invoices
   Status: 200 OK
   Response: [{ id: 123, invoice_number: "INV-2025-0001", ... }]
```

**After Recording Payment:**
```
✅ POST /wp-json/glazieros/v1/invoices/123/payment
   Status: 200 OK
   Request Payload: { amount: 500, payment_date: "2025-10-26", ... }
   Response: { id: 123, balance_due: 1420, status: "partial", ... }
```

---

## 📸 Visual Inspection Checklist

### Dashboard Layout
- [ ] Header: "Finance & Invoicing" title visible
- [ ] Header: Date filter dropdown (right side)
- [ ] Header: "New Invoice" button (purple gradient)
- [ ] Metrics: 4 cards in grid layout
- [ ] Metrics: Hover effect shows shadow
- [ ] Search bar: Placeholder text visible
- [ ] Status filter: Dropdown with all options

### Invoice Table
- [ ] Table header: Purple gradient (#667eea → #764ba2)
- [ ] Table header: 8 columns (Invoice #, Customer, Date, Due Date, Amount, Balance, Status, Actions)
- [ ] Table rows: Zebra striping (alternating background)
- [ ] Table rows: Hover effect (light purple background)
- [ ] Status badges: Correct colors for each status
- [ ] Action buttons: Blue outline style
- [ ] Empty state: Centered icon and message

### Invoice Modal
- [ ] Modal: Blur backdrop overlay
- [ ] Modal: White box with shadow (centered)
- [ ] Modal: Header with title and X close button
- [ ] Form: 2-column grid layout
- [ ] Form: Labels above inputs
- [ ] Form: Required fields marked with red asterisk
- [ ] Line items: Table with add/remove buttons
- [ ] Totals: Right-aligned with bold grand total
- [ ] Footer: Cancel (gray) and Save (purple gradient) buttons

### Animations
- [ ] Modal: Fade in on open
- [ ] Modal: Scale in effect
- [ ] Loading: Rotating spinner
- [ ] Cards: Smooth hover transitions
- [ ] Buttons: Hover brightness increase

---

## 🚨 Common Issues & Solutions

### Problem 1: "wpApiSettings is not defined"
**Solution:** Check if `wp_localize_script()` is called in glazieros-app.php
```php
wp_localize_script( 'gos-dashboard-app-js', 'wpApiSettings', [
    'root'  => esc_url_raw( rest_url() ),
    'nonce' => wp_create_nonce( 'wp_rest' ),
] );
```

### Problem 2: 401 Unauthorized on REST API calls
**Solution:** 
1. Check nonce in request headers
2. Verify user is logged in as admin
3. Clear browser cache and cookies

### Problem 3: Invoices tab shows blank/empty
**Solution:**
1. Check browser console for JavaScript errors
2. Verify finance.css and finance.js are enqueued
3. Check if panel ID matches: `#gsa-invoices`

### Problem 4: Line item totals not calculating
**Solution:**
1. Check event listener on `.gos-line-item-input`
2. Verify `calculateTotals()` method is called
3. Check for JavaScript errors in console

### Problem 5: Database tables not created
**Solution:**
1. Run `/wp-content/plugins/glazieros-app/create-finance-tables.php`
2. Check PHP error log for MySQL errors
3. Verify database user has CREATE TABLE permission

---

## 📊 Expected Database Schema After Testing

### Table: wp_posts
```
post_type: gos_invoice (1 row)
post_status: publish
post_title: INV-2025-0001
```

### Table: wp_postmeta (20+ rows for invoice)
```
_invoice_number: INV-2025-0001
_customer_name: John Smith
_customer_email: john@example.com
_invoice_date: 2025-10-26
_due_date: 2025-11-25
_payment_terms: Net 30
_subtotal: 1600.00
_vat_amount: 320.00
_total_amount: 1920.00
_amount_paid: 1920.00
_balance_due: 0.00
```

### Table: wp_gos_invoice_items (3 rows)
```
Row 1: uPVC Window - White 1200x1000mm | qty: 3 | price: 450.00 | vat: 20% | total: 1620.00
Row 2: Installation Fee | qty: 1 | price: 200.00 | vat: 20% | total: 240.00
Row 3: Delivery Charge | qty: 1 | price: 50.00 | vat: 20% | total: 60.00
```

### Table: wp_gos_payment_allocations (2 rows)
```
Row 1: payment_id: [ID] | invoice_id: [ID] | amount: 500.00
Row 2: payment_id: [ID] | invoice_id: [ID] | amount: 1420.00
```

### Table: wp_gos_transactions (1 row)
```
transaction_type: invoice
amount: 1600.00
vat_amount: 320.00
total_amount: 1920.00
status: paid
```

---

## 🎯 Next Steps After Testing

### If Tests Pass ✅
1. Mark Task 36 as complete
2. Proceed to Task 38: Improve Notification System
3. Build toast notification component
4. Test on mobile devices

### If Tests Fail ❌
1. Document all errors found
2. Mark Task 37 as in-progress: "Fix Integration Issues"
3. Debug issues one by one
4. Re-test until all pass

---

## 📞 Support & Debugging

**Check these locations for errors:**

1. **Browser Console:** `F12` → Console tab
2. **Network Tab:** `F12` → Network → Filter: Fetch/XHR
3. **WordPress Debug Log:** `/wp-content/debug.log` (if WP_DEBUG enabled)
4. **PHP Error Log:** Server error logs
5. **Database:** phpMyAdmin or similar tool

**Helpful Debug Commands:**

```javascript
// Browser Console
window.GlazierOSFinance; // Access Finance app state
GlazierOSFinance.invoices; // View invoice list
GlazierOSFinance.analytics; // View metrics
```

---

**Testing Start Time:** [Record when you begin]  
**Testing End Time:** [Record when complete]  
**Total Issues Found:** [Count]  
**Pass/Fail Status:** [Mark after testing]

