# GlazierOS Finance Module - Architecture & Data Model
**Version:** 1.0.0  
**Date:** October 26, 2025  
**Status:** Architecture Planning Phase

---

## 📋 OVERVIEW

The Finance Module is the central financial hub for GlazierOS, managing all monetary transactions including customer invoicing, expense tracking, payments, payroll, and financial analytics.

### Design Principles
- **Modular & Scalable**: Built to handle 10-10,000+ transactions
- **Real-time Accuracy**: Live calculations with audit trails
- **Integration-First**: Deep links with Jobs, Quotes, Team, Diary modules
- **Future-Proof**: Hooks for Stripe, Xero, Open Banking APIs
- **User-Friendly**: Clean UI matching Quotes v2/Team/Diary v2 aesthetic

---

## 🗄️ DATABASE ARCHITECTURE

### Strategy: Hybrid Custom Post Types + Custom Tables

**Custom Post Types (CPTs):**
- `gos_invoice` - Customer invoices
- `gos_expense` - Supplier invoices and expenses
- `gos_payment_in` - Incoming payments
- `gos_payment_out` - Outgoing payments
- `gos_payslip` - Staff payslips
- `gos_supplier` - Supplier directory

**Custom Tables (for performance):**
- `wp_gos_transactions` - Unified transaction ledger
- `wp_gos_invoice_items` - Invoice line items
- `wp_gos_tax_rates` - VAT/tax configurations
- `wp_gos_payment_allocations` - Payment-to-invoice mappings

**WordPress Core:**
- `wp_postmeta` - Flexible metadata storage
- `wp_posts` - Existing Jobs, Quotes, Team (via gos_job, gos_fitter)
- `wp_users` - Team members, customers
- `wp_gos_audit_log` - Activity logging (existing CPT)

---

## 📊 DATA MODELS

### 1. CUSTOMER INVOICE (`gos_invoice`)

```php
// CPT: gos_invoice
post_title: Invoice number (e.g., "INV-2025-001")
post_status: draft | sent | viewed | paid | overdue | cancelled
post_date: Invoice creation date

// Post Meta
invoice_number: string (auto-generated, configurable format)
invoice_date: date (issue date)
due_date: date (calculated from payment terms)
customer_id: int (wp_users.ID or post meta reference)
customer_name: string
customer_email: string
customer_address: text
customer_phone: string
job_id: int (links to gos_job)
quote_id: int (links to gos_job with quote status)

// Financial Data
subtotal: decimal(10,2)
vat_amount: decimal(10,2)
vat_rate: decimal(5,2) (percentage, e.g., 20.00)
discount_amount: decimal(10,2)
total_amount: decimal(10,2)
amount_paid: decimal(10,2) (updated from payments)
balance_due: decimal(10,2) (calculated: total - amount_paid)

// Payment Configuration
payment_terms: string (e.g., "Net 30", "Due on Receipt")
payment_link: string (Stripe/GoCardless secure URL)
payment_link_expires: datetime
accepts_partial_payments: boolean
deposit_amount: decimal(10,2)
deposit_paid: boolean
instalment_plan: json (frequency, amounts, due dates)

// Tracking
sent_date: datetime (when emailed)
viewed_date: datetime (tracking pixel)
viewed_count: int
last_reminder_sent: datetime
reminder_count: int
pdf_url: string (generated PDF path)

// Additional
notes: text (internal notes)
customer_notes: text (visible to customer)
tags: array (serialized tag IDs)
branch_id: int (multi-branch support)
currency: string (GBP, USD, EUR)
```

**Custom Table: `wp_gos_invoice_items`**
```sql
CREATE TABLE wp_gos_invoice_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  line_order INT DEFAULT 0,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1.00,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 20.00,
  vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity * vat_rate / 100) STORED,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  total DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity * (1 + vat_rate / 100)) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_id (invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES wp_posts(ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2. SUPPLIER INVOICE / EXPENSE (`gos_expense`)

```php
// CPT: gos_expense
post_title: Description (e.g., "Window Materials - ABC Suppliers")
post_status: draft | pending | approved | paid | cancelled
post_date: Expense logged date

// Post Meta
expense_number: string (auto-generated)
expense_date: date (invoice/receipt date)
due_date: date
supplier_id: int (links to gos_supplier CPT)
supplier_name: string
supplier_invoice_number: string

// Categorization
category: string (materials | fuel | tools | equipment | subcontractor | utilities | other)
subcategory: string
job_id: int (link to specific job, optional)
staff_id: int (who incurred the expense)
branch_id: int

// Financial
amount: decimal(10,2)
vat_amount: decimal(10,2)
vat_rate: decimal(5,2)
total_amount: decimal(10,2)
payment_status: unpaid | partial | paid
amount_paid: decimal(10,2)
balance_due: decimal(10,2)

// Recurring
is_recurring: boolean
recurrence_frequency: string (monthly | quarterly | annually)
recurrence_start_date: date
recurrence_end_date: date
next_recurrence_date: date

// Attachments
receipt_url: string (uploaded PDF/image)
attachment_ids: array (multiple file support)

// Additional
payment_method: string (bank_transfer | card | cash | cheque)
reference_number: string
notes: text
tags: array
```

---

### 3. PAYMENT IN (`gos_payment_in`)

```php
// CPT: gos_payment_in
post_title: Payment reference (e.g., "Payment from John Smith")
post_status: matched | unmatched | pending | cleared | refunded
post_date: Payment received date

// Post Meta
payment_date: date
payment_method: string (stripe | card | bank_transfer | cash | cheque | bacs | other)
payment_reference: string (bank reference, transaction ID)
amount: decimal(10,2)
currency: string (GBP)

// Customer Linking
customer_id: int
customer_name: string
customer_email: string

// Invoice Allocation (via custom table)
allocated_amount: decimal(10,2) (sum from allocations table)
unallocated_amount: decimal(10,2) (calculated: amount - allocated)

// Transaction Details
transaction_id: string (Stripe charge ID, bank transaction ID)
gateway: string (stripe | gocardless | manual)
gateway_fee: decimal(10,2)
net_amount: decimal(10,2) (amount - gateway_fee)

// Reconciliation
matched_automatically: boolean
matched_by_user_id: int
matched_date: datetime
bank_import_id: int (if from CSV import)

// Additional
notes: text
tags: array
branch_id: int
is_deposit: boolean
is_refund: boolean
refund_of_payment_id: int (if this is a refund)
```

**Custom Table: `wp_gos_payment_allocations`**
```sql
CREATE TABLE wp_gos_payment_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  allocated_amount DECIMAL(10,2) NOT NULL,
  allocation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  allocated_by_user_id BIGINT UNSIGNED,
  notes TEXT,
  INDEX idx_payment_id (payment_id),
  INDEX idx_invoice_id (invoice_id),
  FOREIGN KEY (payment_id) REFERENCES wp_posts(ID) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES wp_posts(ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 4. PAYMENT OUT (`gos_payment_out`)

```php
// CPT: gos_payment_out
post_title: Payment description (e.g., "Payment to ABC Suppliers")
post_status: scheduled | processing | paid | failed | cancelled
post_date: Payment logged date

// Post Meta
payment_date: date (actual or scheduled)
due_date: date
payment_method: string (bank_transfer | card | cash | cheque | bacs)
payment_reference: string
amount: decimal(10,2)
currency: string

// Payee Information
payee_type: string (supplier | staff | contractor | other)
supplier_id: int (if supplier)
staff_id: int (if staff member)
payee_name: string
payee_account_details: text (encrypted bank details)

// Linking
expense_id: int (link to gos_expense)
payslip_id: int (link to gos_payslip for wage payments)
job_id: int (optional)
category: string

// Recurring
is_recurring: boolean
recurrence_frequency: string
next_payment_date: date

// Approval Workflow
requires_approval: boolean (for amounts over threshold)
approval_status: pending | approved | rejected
approved_by_user_id: int
approved_date: datetime
rejection_reason: text

// Additional
receipt_url: string
notes: text
tags: array
branch_id: int
```

---

### 5. PAYSLIP (`gos_payslip`)

```php
// CPT: gos_payslip
post_title: Payslip reference (e.g., "Payslip - John Smith - Oct 2025")
post_status: draft | sent | paid | archived
post_date: Payslip generation date

// Post Meta
staff_id: int (links to gos_fitter)
staff_name: string
period_start_date: date
period_end_date: date
pay_date: date

// Hours & Rates
hours_worked: decimal(10,2) (pulled from Diary events)
hourly_rate: decimal(10,2)
base_pay: decimal(10,2) (hours * rate or salary amount)
salary_amount: decimal(10,2) (if salaried)
pay_type: string (hourly | salary)

// Additional Payments
overtime_hours: decimal(10,2)
overtime_rate: decimal(10,2)
overtime_pay: decimal(10,2)
bonus: decimal(10,2)
commission: decimal(10,2)
allowances: decimal(10,2) (fuel, tools, etc.)

// Deductions
tax: decimal(10,2)
national_insurance: decimal(10,2)
pension: decimal(10,2)
other_deductions: decimal(10,2)
deduction_notes: text

// Totals
gross_pay: decimal(10,2) (base + overtime + bonus + commission + allowances)
total_deductions: decimal(10,2) (tax + ni + pension + other)
net_pay: decimal(10,2) (gross - deductions)

// Payment
payment_status: unpaid | paid
payment_date: date
payment_method: string (bacs | cash | cheque)
payment_reference: string
payment_out_id: int (link to gos_payment_out)

// Documents
pdf_url: string (generated payslip PDF)
sent_date: datetime

// Additional
notes: text (visible to staff)
internal_notes: text (admin only)
branch_id: int
```

---

### 6. SUPPLIER (`gos_supplier`)

```php
// CPT: gos_supplier
post_title: Supplier name
post_status: active | inactive | archived

// Post Meta
company_name: string
contact_name: string
email: string
phone: string
mobile: string
address: text
website: string

// Financial
payment_terms: string (Net 30, Net 60, etc.)
credit_limit: decimal(10,2)
current_balance: decimal(10,2) (outstanding amount)
total_spent: decimal(10,2) (historical)

// Banking
bank_name: string
account_number: string (encrypted)
sort_code: string (encrypted)
iban: string (encrypted)

// Categorization
supplier_type: string (materials | equipment | subcontractor | utilities | other)
is_preferred: boolean
rating: int (1-5 stars)

// Additional
vat_number: string
company_number: string
notes: text
tags: array
branch_id: int
```

---

### 7. UNIFIED TRANSACTION LEDGER (`wp_gos_transactions`)

**Purpose**: Fast analytics queries without JOINs across multiple CPTs

```sql
CREATE TABLE wp_gos_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_type ENUM('invoice', 'expense', 'payment_in', 'payment_out', 'payslip') NOT NULL,
  post_id BIGINT UNSIGNED NOT NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255),
  
  -- Financial
  amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Categorization
  category VARCHAR(50),
  job_id BIGINT UNSIGNED,
  customer_id BIGINT UNSIGNED,
  supplier_id BIGINT UNSIGNED,
  staff_id BIGINT UNSIGNED,
  branch_id BIGINT UNSIGNED,
  
  -- Status
  status VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for fast queries
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_job_id (job_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_staff_id (staff_id),
  INDEX idx_branch_id (branch_id),
  INDEX idx_status (status),
  INDEX idx_date_type (transaction_date, transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Triggers**: Automatically populate on CPT save/update/delete

---

### 8. TAX RATES (`wp_gos_tax_rates`)

```sql
CREATE TABLE wp_gos_tax_rates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rate_name VARCHAR(50) NOT NULL,
  rate_percentage DECIMAL(5,2) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rate_name (rate_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default data
INSERT INTO wp_gos_tax_rates (rate_name, rate_percentage, is_default, is_active) VALUES
('VAT Standard Rate', 20.00, TRUE, TRUE),
('VAT Reduced Rate', 5.00, FALSE, TRUE),
('VAT Zero Rate', 0.00, FALSE, TRUE),
('No VAT', 0.00, FALSE, TRUE);
```

---

### 9. TAGS (Using WordPress Taxonomy)

```php
// Register custom taxonomy for financial tags
register_taxonomy('gos_finance_tag', [
    'gos_invoice',
    'gos_expense',
    'gos_payment_in',
    'gos_payment_out',
    'gos_payslip'
], [
    'hierarchical' => false,
    'labels' => [...],
    'show_ui' => true,
    'show_in_rest' => true,
    'query_var' => true,
    'rewrite' => ['slug' => 'finance-tag'],
]);
```

**Common Tags**:
- Payment Status: `pending-review`, `awaiting-approval`, `urgent`
- Categories: `fuel-cost`, `materials`, `subcontractor`
- Projects: `bathroom-project`, `commercial-job`
- Priority: `high-priority`, `low-priority`

---

### 10. ATTACHMENTS (Using WordPress Media Library)

```php
// Store attachment relationships in postmeta
meta_key: '_finance_attachments'
meta_value: array of attachment IDs

// Each attachment (wp_posts where post_type = 'attachment'):
attachment.ID: int
attachment.post_title: Filename
attachment.guid: File URL
attachment.post_mime_type: image/jpeg, application/pdf, etc.

// Additional attachment meta:
_attachment_type: string (receipt | invoice | contract | statement | other)
_attachment_uploaded_by: int (user ID)
_attachment_description: text
_attachment_category: string
```

---

## 🔗 DATA RELATIONSHIPS

### Entity Relationship Diagram (ERD)

```
┌─────────────┐
│   gos_job   │◄─────┐
│  (Existing) │      │
└─────────────┘      │
       │             │
       │ 1:N         │ 1:1
       │             │
       ▼             │
┌──────────────┐     │
│ gos_invoice  │─────┘
│              │
│ - invoice_id │
│ - job_id     │◄────────────┐
│ - customer   │             │
│ - total      │             │ N:N
└──────────────┘             │ (allocations)
       │                     │
       │ 1:N                 │
       │                     │
       ▼                     │
┌──────────────────┐         │
│wp_gos_invoice_   │         │
│      items       │         │
│                  │         │
│ - line_order     │         │
│ - description    │         │
│ - quantity       │         │
│ - unit_price     │    ┌────────────────┐
│ - total          │    │ gos_payment_in │
└──────────────────┘    │                │
                        │ - amount       │
┌─────────────┐         │ - method       │
│ gos_fitter  │         │ - customer_id  │
│  (Existing) │         └────────────────┘
└─────────────┘                 │
       │                        │ N:N
       │ 1:N                    │
       │                        ▼
       ▼                 ┌──────────────────────┐
┌──────────────┐         │wp_gos_payment_       │
│ gos_payslip  │         │   allocations        │
│              │         │                      │
│ - staff_id   │         │ - payment_id         │
│ - period     │         │ - invoice_id         │
│ - net_pay    │         │ - allocated_amount   │
└──────────────┘         └──────────────────────┘
       │
       │ 1:1
       │
       ▼
┌──────────────────┐
│ gos_payment_out  │
│                  │
│ - payslip_id     │
│ - staff_id       │
│ - amount         │
└──────────────────┘

┌──────────────┐         ┌──────────────────┐
│ gos_supplier │         │   gos_expense    │
│              │◄────────│                  │
│ - name       │   N:1   │ - supplier_id    │
│ - payment_   │         │ - category       │
│   terms      │         │ - amount         │
└──────────────┘         │ - job_id         │
                         └──────────────────┘
                                  │
                                  │ 1:1
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ gos_payment_out  │
                         │                  │
                         │ - expense_id     │
                         │ - supplier_id    │
                         └──────────────────┘

┌──────────────────────┐
│ wp_gos_transactions  │  ← Denormalized ledger
│                      │     for fast analytics
│ - transaction_type   │
│ - post_id            │
│ - amount             │
│ - transaction_date   │
│ - job_id             │
│ - customer_id        │
│ - supplier_id        │
│ - staff_id           │
└──────────────────────┘
```

### Key Relationships

1. **Invoice → Job**: `invoice.job_id` → `gos_job.ID` (1:1 or N:1)
2. **Invoice → Items**: `invoice.ID` → `invoice_items.invoice_id` (1:N)
3. **Invoice → Payments**: Via `payment_allocations` table (N:N)
4. **Payment → Customer**: `payment_in.customer_id` → `wp_users.ID` or custom customer field
5. **Expense → Supplier**: `expense.supplier_id` → `gos_supplier.ID` (N:1)
6. **Expense → Job**: `expense.job_id` → `gos_job.ID` (N:1, optional)
7. **Payslip → Staff**: `payslip.staff_id` → `gos_fitter.ID` (N:1)
8. **Payslip → Payment Out**: `payslip.payment_out_id` → `gos_payment_out.ID` (1:1)
9. **Payment Out → Expense**: `payment_out.expense_id` → `gos_expense.ID` (1:1, optional)

---

## 🔌 REST API ENDPOINTS

### Base URL: `/wp-json/glazieros/v1/finance/`

### **Invoices**

```
GET    /invoices                    - List all invoices (with filters)
GET    /invoices/{id}               - Get single invoice
POST   /invoices                    - Create invoice
POST   /invoices/{id}               - Update invoice
DELETE /invoices/{id}               - Delete invoice
POST   /invoices/{id}/send          - Send invoice via email
POST   /invoices/{id}/record-view   - Record invoice view (tracking pixel)
POST   /invoices/{id}/generate-pdf  - Generate PDF
GET    /invoices/{id}/pdf           - Download PDF
POST   /invoices/bulk-send          - Send multiple invoices
GET    /invoices/stats              - Invoice statistics
```

### **Expenses**

```
GET    /expenses                    - List all expenses
GET    /expenses/{id}               - Get single expense
POST   /expenses                    - Create expense
POST   /expenses/{id}               - Update expense
DELETE /expenses/{id}               - Delete expense
POST   /expenses/{id}/attach        - Upload receipt/invoice
GET    /expenses/categories         - Get expense categories
GET    /expenses/recurring          - Get recurring expenses
POST   /expenses/recurring/{id}/generate - Generate next occurrence
```

### **Payments In**

```
GET    /payments-in                 - List all incoming payments
GET    /payments-in/{id}            - Get single payment
POST   /payments-in                 - Record payment
POST   /payments-in/{id}            - Update payment
DELETE /payments-in/{id}            - Delete payment
POST   /payments-in/{id}/allocate   - Allocate to invoice(s)
POST   /payments-in/match           - Auto-match payments to invoices
POST   /payments-in/import          - Import from CSV
GET    /payments-in/unmatched       - Get unmatched payments
```

### **Payments Out**

```
GET    /payments-out                - List all outgoing payments
GET    /payments-out/{id}           - Get single payment
POST   /payments-out                - Record payment
POST   /payments-out/{id}           - Update payment
DELETE /payments-out/{id}            - Delete payment
POST   /payments-out/{id}/approve   - Approve payment (if requires approval)
GET    /payments-out/pending-approval - Get payments awaiting approval
```

### **Payslips**

```
GET    /payslips                    - List all payslips
GET    /payslips/{id}               - Get single payslip
POST   /payslips                    - Create payslip
POST   /payslips/{id}               - Update payslip
DELETE /payslips/{id}               - Delete payslip
POST   /payslips/{id}/generate-pdf  - Generate PDF
POST   /payslips/{id}/send          - Email to staff member
GET    /payslips/staff/{staff_id}   - Get all payslips for staff member
POST   /payslips/calculate-hours    - Calculate hours from Diary
```

### **Suppliers**

```
GET    /suppliers                   - List all suppliers
GET    /suppliers/{id}              - Get single supplier
POST   /suppliers                   - Create supplier
POST   /suppliers/{id}              - Update supplier
DELETE /suppliers/{id}              - Delete supplier
GET    /suppliers/{id}/history      - Get financial history
GET    /suppliers/{id}/balance      - Get current balance
```

### **Analytics**

```
GET    /analytics/dashboard         - Main dashboard metrics
GET    /analytics/revenue           - Revenue breakdown
GET    /analytics/expenses          - Expense breakdown
GET    /analytics/profit-loss       - P&L statement
GET    /analytics/cash-flow         - Cash flow data
GET    /analytics/outstanding       - Outstanding invoices
GET    /analytics/job-profitability - Profit per job
GET    /analytics/customer-ltv      - Customer lifetime value
GET    /analytics/trends            - Historical trends
```

### **Tags & Filters**

```
GET    /tags                        - Get all finance tags
POST   /tags                        - Create tag
DELETE /tags/{id}                   - Delete tag
POST   /bulk-tag                    - Add tags to multiple items
GET    /filter-presets              - Get saved filter presets
POST   /filter-presets              - Save filter preset
DELETE /filter-presets/{id}         - Delete preset
```

### **Reconciliation**

```
POST   /reconcile/suggest-matches   - Get suggested payment matches
POST   /reconcile/auto-match        - Auto-match payments
POST   /reconcile/manual-match      - Manual match payment to invoice
GET    /reconcile/duplicates        - Detect duplicate entries
```

### **Reports**

```
POST   /reports/generate            - Generate custom report
GET    /reports/export              - Export to CSV/Excel
GET    /reports/templates           - Get report templates
POST   /reports/schedule            - Schedule recurring report
```

### **Attachments**

```
POST   /attachments/upload          - Upload file
GET    /attachments/{id}            - Get attachment details
DELETE /attachments/{id}            - Delete attachment
```

---

## 🎨 UI/UX ARCHITECTURE

### Main Finance Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Finance Dashboard                          [Date Range] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Revenue  │  │ Expenses │  │Net Profit│  │Outstanding││
│  │ £45,230  │  │ £12,450  │  │ £32,780  │  │  £8,900  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                           │
│  ┌─────────────────────────────────┐  ┌────────────────┐│
│  │ Revenue Trend (Line Chart)      │  │ Top Customers  ││
│  │                                  │  │ 1. ABC Ltd     ││
│  │    /\      /\                   │  │ 2. XYZ Corp    ││
│  │   /  \    /  \    /\            │  │ 3. Smith Ltd   ││
│  │  /    \  /    \  /  \           │  │                ││
│  └─────────────────────────────────┘  └────────────────┘│
│                                                           │
│  ┌─────────────────────────────────┐  ┌────────────────┐│
│  │ Expense Breakdown (Pie Chart)   │  │Recent Activity ││
│  │                                  │  │ • Invoice sent ││
│  │      Materials: 60%              │  │ • Payment recv ││
│  │      Labour: 25%                 │  │ • Expense added││
│  │      Other: 15%                  │  │                ││
│  └─────────────────────────────────┘  └────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Invoice List View

```
┌─────────────────────────────────────────────────────────┐
│ Invoices                    [+ New Invoice] [Export CSV]│
├─────────────────────────────────────────────────────────┤
│ [Search...] [Status ▼] [Date Range] [Customer ▼] [Tags]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ INV-001 | John Smith | £2,450 | Sent | Due: 30 Nov │ │
│ │ [View] [Send] [PDF]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ INV-002 | ABC Ltd | £12,350 | Overdue | Due: 15 Oct│ │
│ │ [View] [Send] [PDF] [Remind]                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ [Showing 1-20 of 145]              [< 1 2 3 4 5 ... >]  │
└─────────────────────────────────────────────────────────┘
```

### Invoice Detail Modal

```
┌───────────────────────────────────────────────────────┐
│ Invoice INV-2025-001                   [Edit] [Delete]│
├───────────────────────────────────────────────────────┤
│                                                         │
│ Customer: John Smith                 Status: [Sent ▼] │
│ Email: john@example.com              Due: 30 Nov 2025 │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Line Items                                      │   │
│ │ ┌─────────────────────────────────────────────┐ │   │
│ │ │ Window Installation | 2 | £1,200 | £2,400  │ │   │
│ │ └─────────────────────────────────────────────┘ │   │
│ │ [+ Add Line Item]                               │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│                                      Subtotal: £2,400  │
│                                      VAT (20%): £480   │
│                                      Total: £2,880     │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Payments Received                               │   │
│ │ • £1,000 - 15 Oct 2025 (Card)                   │   │
│ │ Balance Due: £1,880                             │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [Send Invoice] [Generate PDF] [Record Payment]         │
└───────────────────────────────────────────────────────┘
```

---

## 🔒 SECURITY & PERMISSIONS

### Role-Based Access Control

```php
// Custom capabilities
$capabilities = [
    // Invoices
    'view_invoices',
    'create_invoices',
    'edit_invoices',
    'delete_invoices',
    'send_invoices',
    
    // Payments
    'view_payments',
    'record_payments',
    'edit_payments',
    'delete_payments',
    'approve_payments', // For large amounts
    
    // Expenses
    'view_expenses',
    'create_expenses',
    'edit_expenses',
    'delete_expenses',
    
    // Payroll
    'view_all_payslips',
    'view_own_payslip',
    'create_payslips',
    'edit_payslips',
    'delete_payslips',
    
    // Reports
    'view_financial_reports',
    'export_financial_data',
    
    // Settings
    'manage_finance_settings',
    'manage_suppliers',
    'manage_tax_rates',
];

// Role assignments
'gos_finance' => all capabilities
'gos_manager' => view + create + edit (no delete)
'administrator' => all capabilities
'gos_fitter' => view_own_payslip only
```

### Data Isolation

- **Branch-level**: Users see only their branch's data (unless admin)
- **Staff-level**: Staff see only their own payslips
- **Customer-level**: Customers can view their invoices via secure link

### Audit Trail

- Log all financial changes in `gos_audit_log`
- Record: who, what, when, old value, new value
- Immutable log (cannot be deleted)

---

## 📈 ANALYTICS & CALCULATIONS

### Key Metrics

**Revenue Metrics:**
```php
total_revenue = SUM(invoices.total_amount WHERE status = 'paid')
monthly_revenue = SUM(invoices.total_amount WHERE status = 'paid' AND MONTH(payment_date) = current_month)
outstanding_revenue = SUM(invoices.balance_due WHERE status IN ('sent', 'viewed', 'overdue'))
overdue_revenue = SUM(invoices.balance_due WHERE status = 'overdue')
```

**Expense Metrics:**
```php
total_expenses = SUM(expenses.total_amount WHERE payment_status = 'paid')
monthly_expenses = SUM(expenses.total_amount WHERE payment_status = 'paid' AND MONTH(payment_date) = current_month)
pending_expenses = SUM(expenses.balance_due WHERE payment_status IN ('unpaid', 'partial'))
```

**Profit Metrics:**
```php
gross_profit = total_revenue - direct_costs
net_profit = total_revenue - total_expenses
profit_margin = (net_profit / total_revenue) * 100
```

**Job Profitability:**
```php
job_revenue = invoice.total_amount
job_costs = SUM(expenses.total_amount WHERE expense.job_id = job.ID)
job_labour = SUM(payslips.net_pay WHERE linked to job via Diary)
job_profit = job_revenue - job_costs - job_labour
job_margin = (job_profit / job_revenue) * 100
```

**Customer Lifetime Value:**
```php
customer_ltv = SUM(invoices.total_amount WHERE customer_id = X AND status = 'paid')
customer_average_invoice = customer_ltv / COUNT(invoices WHERE customer_id = X)
customer_payment_behavior = AVG(payment_date - due_date) // Negative = early, Positive = late
```

### Performance Optimization

- **Caching**: Cache dashboard metrics (refresh every 5 minutes)
- **Indexing**: Database indexes on frequently queried fields
- **Aggregation**: Use `wp_gos_transactions` table for fast queries
- **Pagination**: Limit results to 50 per page
- **Background Jobs**: Calculate complex reports in background

---

## 🚀 INTEGRATION POINTS

### Existing GlazierOS Modules

**1. Jobs Module (`gos_job`)**
- Link invoices to jobs via `invoice.job_id`
- Auto-populate invoice with job details
- Track job profitability (revenue vs. costs)

**2. Quotes Module**
- Convert quote to invoice with one click
- Pre-fill invoice with quote items and pricing
- Link: `invoice.quote_id = job.ID (where quote status)`

**3. Team Module (`gos_fitter`)**
- Pull staff for payslips
- Link expenses to team members
- Track revenue per team member

**4. Diary Module**
- Calculate hours worked from events
- Auto-fill payslips with hours
- Link labour costs to jobs

**5. Customers** (via `gos_job` meta or `wp_users`)
- Customer financial history
- Payment behavior tracking
- Credit limit management

### External Integrations (Future)

**1. Stripe**
```php
// Webhook endpoint: /wp-json/glazieros/v1/webhooks/stripe
// Events: charge.succeeded, charge.refunded, payment_intent.succeeded
// Action: Auto-create payment_in, allocate to invoice, update status
```

**2. Open Banking**
```php
// OAuth2 flow for bank connection
// Fetch transactions daily
// Auto-match to invoices/expenses
// Show live bank balance
```

**3. Xero/QuickBooks**
```php
// Two-way sync
// Map: Invoice → Xero Invoice, Expense → Xero Bill, Payment → Xero Payment
// Sync frequency: Every 15 minutes or manual trigger
```

---

## 📝 NEXT STEPS (Implementation Order)

### Phase 1: Foundation (Week 1)
1. ✅ Architecture planning (this document)
2. Create database tables and CPTs
3. Build REST API endpoints (basic CRUD)
4. Set up permissions and roles

### Phase 2: Core Features (Weeks 2-3)
5. Customer invoices CRUD
6. Invoice PDF generation
7. Payments in tracking
8. Expense logging
9. Basic reconciliation

### Phase 3: UI/UX (Week 4)
10. Finance dashboard layout
11. Invoice list and detail views
12. Payment entry forms
13. Expense tracking interface

### Phase 4: Advanced Features (Weeks 5-6)
14. Payslips system
15. Analytics dashboard
16. Smart reconciliation
17. Tagging and filtering
18. Email automation

### Phase 5: Integrations (Weeks 7-8)
19. Stripe integration
20. CSV import/export
21. PDF email delivery
22. Notification system

### Phase 6: Polish & Launch (Week 9)
23. Testing and bug fixes
24. Performance optimization
25. Documentation
26. User training materials

---

## 🎯 SUCCESS METRICS

- **Data Integrity**: 100% accuracy in calculations
- **Performance**: Dashboard loads in <2 seconds
- **User Adoption**: 80% of invoices sent via system within 3 months
- **Time Savings**: 50% reduction in manual invoice creation
- **Payment Speed**: 20% improvement in payment collection time
- **Reporting**: Weekly financial reports generated in <10 clicks

---

**Status**: ✅ Architecture Complete - Ready for Implementation

**Last Updated**: October 26, 2025
