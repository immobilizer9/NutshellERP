// lib/sendTaskEmail.ts
import nodemailer from "nodemailer";

type TaskEmailOptions = {
  to:           string;   // sales rep email
  salesRepName: string;
  assignedByName: string;
  taskTitle:    string;
  taskDescription?: string;
  dueDate:      string;
  dashboardUrl?: string;
};

export async function sendTaskEmail(opts: TaskEmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:   { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const dashboard = opts.dashboardUrl ?? "your ERP dashboard";
  const isLink    = opts.dashboardUrl?.startsWith("http");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#6366f1;padding:24px 32px;">
    <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">NUTSHELL</p>
    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">NEW TASK ASSIGNED</p>
  </div>

  <div style="padding:28px 32px;">
    <p style="font-size:15px;font-weight:600;color:#111118;margin:0 0 6px;">Hi ${opts.salesRepName},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
      <strong>${opts.assignedByName}</strong> has assigned you a new task.
    </p>

    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Task</p>
      <p style="font-size:16px;font-weight:700;color:#111118;margin:0 0 6px;">${opts.taskTitle}</p>
      ${opts.taskDescription ? `<p style="font-size:13.5px;color:#374151;margin:0 0 10px;line-height:1.5;">${opts.taskDescription}</p>` : ""}
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <span style="font-size:12px;background:#fff;border:1px solid #c7d2fe;color:#6366f1;padding:3px 10px;border-radius:99px;font-weight:600;">
          Due: ${opts.dueDate}
        </span>
      </div>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
      Please log in to your dashboard to view and complete this task.
    </p>

    ${isLink ? `
    <a href="${opts.dashboardUrl}"
      style="display:inline-block;background:#6366f1;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
      View Task →
    </a>` : `<p style="font-size:13px;color:#6b7280;">Visit: ${dashboard}</p>`}
  </div>

  <div style="background:#f9f9fb;padding:14px 32px;border-top:1px solid #f0f0f2;">
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
      Nutshell GK Books · Automated task notification
    </p>
  </div>

</div>
</body>
</html>`.trim();

  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to:      opts.to,
    subject: `New Task: ${opts.taskTitle} — Due ${opts.dueDate}`,
    html,
  });
}