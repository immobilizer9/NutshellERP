// lib/sendDesignEmail.ts
import nodemailer from "nodemailer";

type DesignEmailParams = {
  documentId: string;
  documentTitle: string;
  topicTitle: string;
  productType: string;
  classFrom: number;
  classTo: number;
  adminComment: string | null;
  bodyHtml: string;
  designTeamEmails: string[];
  erpBaseUrl: string;
};

async function sendDesignEmail(params: DesignEmailParams): Promise<void> {
  const {
    documentId,
    documentTitle,
    topicTitle,
    productType,
    classFrom,
    classTo,
    adminComment,
    bodyHtml,
    designTeamEmails,
    erpBaseUrl,
  } = params;

  if (!designTeamEmails.length) return;

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:   { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const documentUrl = erpBaseUrl ? `${erpBaseUrl}/content/documents/${documentId}` : null;
  const safeTitle = documentTitle.replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "-");

  const attachmentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${documentTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #1a1a2e;
      background: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .doc-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #64748b; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
    }
    .instructions {
      margin-top: 16px;
      padding: 12px 16px;
      background: #fef9c3;
      border-left: 4px solid #eab308;
      border-radius: 4px;
      font-size: 13px;
      color: #713f12;
    }
    .body { line-height: 1.8; }
    .body h1, .body h2 { margin: 20px 0 10px; }
    .body p { margin-bottom: 12px; }
    .body ul, .body ol { margin: 12px 0 12px 24px; }
    .body li { margin-bottom: 6px; }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${documentTitle}</h1>
    <div class="meta">
      <span><strong>Topic:</strong> ${topicTitle}</span>
      <span class="badge">${productType}</span>
      <span>Class ${classFrom}–${classTo}</span>
    </div>
    ${adminComment ? `<div class="instructions"><strong>Design Instructions:</strong> ${adminComment}</div>` : ""}
  </div>
  <div class="body">
    ${bodyHtml || "<p><em>No content yet.</em></p>"}
  </div>
  <div class="footer">
    Design task from Nutshell ERP · ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
  </div>
</body>
</html>`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#6366f1;padding:24px 32px;">
    <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">NUTSHELL</p>
    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">DESIGN TASK ASSIGNED</p>
  </div>

  <div style="padding:28px 32px;">
    <p style="font-size:15px;font-weight:600;color:#111118;margin:0 0 6px;">Hello Design Team,</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
      A new document has been sent to your queue for design. Please review the attached content file.
    </p>

    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Document Details</p>
      <p style="font-size:16px;font-weight:700;color:#111118;margin:0 0 6px;">${documentTitle}</p>
      <p style="font-size:13px;color:#374151;margin:0 0 4px;"><strong>Topic:</strong> ${topicTitle}</p>
      <p style="font-size:13px;color:#374151;margin:0 0 4px;"><strong>Product:</strong> ${productType}</p>
      <p style="font-size:13px;color:#374151;margin:0;"><strong>Class Range:</strong> ${classFrom} – ${classTo}</p>
    </div>

    ${adminComment ? `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="font-size:12px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Design Instructions</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.6;">${adminComment}</p>
    </div>` : ""}

    <p style="font-size:13px;color:#6b7280;margin:0 0 16px;line-height:1.6;">
      The full document content is attached as an HTML file. Once design is complete, please upload the designed file URL back to the ERP system.
    </p>

    ${documentUrl ? `
    <a href="${documentUrl}"
      style="display:inline-block;background:#6366f1;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
      View in ERP →
    </a>` : ""}
  </div>

  <div style="background:#f9f9fb;padding:14px 32px;border-top:1px solid #f0f0f2;">
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
      Nutshell GK Books · Automated design task notification
    </p>
  </div>

</div>
</body>
</html>`.trim();

  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to:      designTeamEmails.join(", "),
    subject: `Design Task: ${documentTitle}`,
    html:    emailHtml,
    attachments: [
      {
        filename:    `${safeTitle}.html`,
        content:     attachmentHtml,
        contentType: "text/html",
      },
    ],
  });
}

export function fireDesignEmail(params: DesignEmailParams): void {
  sendDesignEmail(params).catch(() => {});
}
