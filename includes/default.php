<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice <?php echo $invoice_data['invoice_number']; ?></title>
    <style>
        body { font-family: sans-serif; font-size: 10pt; color: #333; }
        .container { width: 100%; margin: 0 auto; }
        .header, .footer { text-align: center; }
        .header h1 { margin: 0; }
        .details { margin-top: 40px; margin-bottom: 40px; }
        .details table { width: 100%; }
        .details .company-details { text-align: left; }
        .details .invoice-details { text-align: right; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .items-table .text-right { text-align: right; }
        .totals { float: right; width: 40%; margin-top: 20px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px; }
        .terms { margin-top: 100px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>INVOICE</h1>
            <p><?php echo htmlspecialchars($invoice_data['company_name']); ?></p>
            <p><?php echo htmlspecialchars($invoice_data['company_address']); ?></p>
        </div>

        <div class="details">
            <table>
                <tr>
                    <td class="company-details">
                        <strong>Bill To:</strong><br>
                        <?php echo htmlspecialchars($invoice_data['customer_name']); ?><br>
                        <?php echo nl2br(htmlspecialchars($invoice_data['customer_address'])); ?>
                    </td>
                    <td class="invoice-details">
                        <strong>Invoice #:</strong> <?php echo htmlspecialchars($invoice_data['invoice_number']); ?><br>
                        <strong>Issue Date:</strong> <?php echo htmlspecialchars($invoice_data['issue_date']); ?><br>
                        <strong>Due Date:</strong> <?php echo htmlspecialchars($invoice_data['due_date']); ?>
                    </td>
                </tr>
            </table>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($invoice_data['line_items'] as $item): ?>
                <tr>
                    <td><?php echo htmlspecialchars($item['description']); ?></td>
                    <td class="text-right"><?php echo htmlspecialchars($item['quantity']); ?></td>
                    <td class="text-right">&pound;<?php echo number_format($item['unit_price'], 2); ?></td>
                    <td class="text-right">&pound;<?php echo number_format($item['total'], 2); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">&pound;<?php echo number_format($invoice_data['subtotal'], 2); ?></td>
                </tr>
                <tr>
                    <td>VAT (20%):</td>
                    <td class="text-right">&pound;<?php echo number_format($invoice_data['vat_amount'], 2); ?></td>
                </tr>
                <tr>
                    <td><strong>Total Due:</strong></td>
                    <td class="text-right"><strong>&pound;<?php echo number_format($invoice_data['total'], 2); ?></strong></td>
                </tr>
            </table>
        </div>

        <div style="clear:both;"></div>

        <div class="terms">
            <strong>Notes:</strong>
            <p><?php echo htmlspecialchars($invoice_data['notes']); ?></p>
            <br>
            <strong>Payment Terms:</strong>
            <p><?php echo htmlspecialchars($invoice_data['payment_terms']); ?></p>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
        </div>
    </div>
</body>
</html>