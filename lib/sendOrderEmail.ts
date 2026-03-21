// lib/sendOrderEmail.ts
import nodemailer from "nodemailer";

type EmailOptions = {
  to:             string;
  schoolName:     string;
  orderId:        string;
  productType:    string;
  grossAmount:    number;
  salesRepName:   string;
  salesRepEmail:  string;
  salesRepPhone?: string;    // ✅ new
  vendorName?:    string;    // ✅ new
  vendorPhone?:   string;    // ✅ new
  vendorEmail?:   string;    // ✅ new
  vendorAddress?: string;    // ✅ new
  orderDate?:     string;
  deliveryDate?:  string;
  items:          { className: string; quantity: number; unitPrice: number; total: number }[];
  pdfBuffer?:     Buffer;
};

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks (Plains)",
  PAPERBACKS_HILLS:  "Paperbacks (Hills)",
};

function buildHtml(opts: EmailOptions): string {
  const itemRows = opts.items
    .map((i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f2;">${i.className}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f2;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f2;text-align:right;">₹${i.unitPrice}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f2;text-align:right;font-weight:600;">₹${i.total.toLocaleString("en-IN")}</td>
      </tr>`)
    .join("");

  const vendorSection = opts.vendorName ? `
    <div style="background:#f9f9fb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Vendor Details</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="color:#6b7280;padding:3px 0;width:140px;">Vendor Name</td><td style="font-weight:600;">${opts.vendorName}</td></tr>
        ${opts.vendorPhone   ? `<tr><td style="color:#6b7280;padding:3px 0;">Phone</td><td style="font-weight:600;">${opts.vendorPhone}</td></tr>` : ""}
        ${opts.vendorEmail   ? `<tr><td style="color:#6b7280;padding:3px 0;">Email</td><td style="font-weight:600;">${opts.vendorEmail}</td></tr>` : ""}
        ${opts.vendorAddress ? `<tr><td style="color:#6b7280;padding:3px 0;">Address</td><td style="font-weight:600;">${opts.vendorAddress}</td></tr>` : ""}
      </table>
    </div>` : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#6366f1;padding:28px 32px;">
    <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">NUTSHELL</p>
    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:0.5px;">GK BOOKS — ORDER CONFIRMATION</p>
  </div>

  <div style="padding:28px 32px;">
    <p style="font-size:16px;font-weight:600;color:#111118;margin:0 0 6px;">Dear ${opts.schoolName},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
      Thank you for your order. Please find your order details below.
      ${opts.pdfBuffer ? "A PDF copy is attached to this email." : ""}
    </p>

    <div style="background:#f9f9fb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Order Info</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="color:#6b7280;padding:3px 0;width:140px;">Order ID</td><td style="font-weight:600;font-family:monospace;font-size:12px;">${opts.orderId}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0;">Product Type</td><td style="font-weight:600;">${PRODUCT_LABELS[opts.productType] ?? opts.productType}</td></tr>
        ${opts.orderDate    ? `<tr><td style="color:#6b7280;padding:3px 0;">Order Date</td><td style="font-weight:600;">${opts.orderDate}</td></tr>` : ""}
        ${opts.deliveryDate ? `<tr><td style="color:#6b7280;padding:3px 0;">Delivery Date</td><td style="font-weight:600;">${opts.deliveryDate}</td></tr>` : ""}
      </table>
    </div>

    ${vendorSection}

    <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Books Ordered</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #f0f0f2;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f4f4f5;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">Class</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;">Price</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="background:#eef2ff;">
          <td colspan="3" style="padding:10px 12px;font-weight:700;color:#4338ca;">Gross Total</td>
          <td style="padding:10px 12px;font-weight:700;color:#4338ca;text-align:right;font-size:15px;">
            ₹${opts.grossAmount.toLocaleString("en-IN")}
          </td>
        </tr>
      </tfoot>
    </table>

    <p style="font-size:13px;color:#6b7280;margin:24px 0 0;line-height:1.6;">
      For queries, contact <strong>${opts.salesRepName}</strong>
      ${opts.salesRepPhone ? ` at <strong>${opts.salesRepPhone}</strong>` : ""}
      or email <a href="mailto:${opts.salesRepEmail}" style="color:#6366f1;">${opts.salesRepEmail}</a>.
    </p>
  </div>

  <div style="background:#f9f9fb;padding:16px 32px;border-top:1px solid #f0f0f2;">
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
      Nutshell GK Books · This is an automated order confirmation
    </p>
  </div>

</div>
</body>
</html>`.trim();
}

export async function sendOrderEmail(opts: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:   { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to:      opts.to,
    subject: `Order Confirmation — ${opts.schoolName} | ${PRODUCT_LABELS[opts.productType] ?? opts.productType}`,
    html:    buildHtml(opts),
    attachments: opts.pdfBuffer
      ? [{ filename: `Nutshell_Order_${opts.orderId}.pdf`, content: opts.pdfBuffer, contentType: "application/pdf" }]
      : [],
  });
}