const { Resend } = require('resend');

const env = require('../config/env');

const formatValue = (value, fallback = 'Unknown') =>
  value === null || typeof value === 'undefined' || value === '' ? fallback : value;

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildWildfireAlertHtml = ({ user, fires, origin, radius }) => {
  const fireRows = fires.slice(0, 5).map((fire) => {
    const containment =
      typeof fire.containment === 'number' ? `${fire.containment}%` : 'Unknown';
    const distance =
      typeof fire.distanceMiles === 'number' ? `${fire.distanceMiles.toFixed(1)} miles away` : '';

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #fee2e2;">
          <strong style="color:#991b1b;">${escapeHtml(formatValue(fire.name, 'Wildfire record'))}</strong>
          <div style="color:#374151;margin-top:4px;">${escapeHtml(formatValue(fire.location))}</div>
          <div style="color:#6b7280;margin-top:4px;font-size:13px;">
            Containment: ${escapeHtml(containment)}${distance ? ` · ${escapeHtml(distance)}` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;background:#fff7ed;padding:24px;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #fecaca;border-radius:8px;overflow:hidden;">
        <div style="background:#dc2626;color:#ffffff;padding:18px 22px;">
          <h1 style="margin:0;font-size:22px;">Wildfire alert near ${escapeHtml(origin?.label || 'your monitored location')}</h1>
        </div>
        <div style="padding:22px;">
          <p style="margin:0 0 14px;">Hi ${escapeHtml(user?.name || 'there')},</p>
          <p style="margin:0 0 16px;">
            Wildfire activity was found within ${escapeHtml(radius)} miles of your monitored location.
            Stay alert, follow evacuation guidance, and stay safe.
          </p>
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #fee2e2;border-radius:8px;overflow:hidden;">
            ${fireRows}
          </table>
          <p style="margin:18px 0 0;color:#6b7280;font-size:13px;">
            Safety reminder: monitor official local alerts, prepare evacuation essentials, and leave immediately if authorities issue an evacuation order.
          </p>
        </div>
      </div>
    </div>
  `;
};

const sendWildfireAlertEmail = async ({ to, user, fires, origin, radius }) => {
  if (!env.resendApiKey || !env.alertFromEmail) {
    return {
      sent: false,
      skipped: true,
      reason: 'Resend email is not configured.',
    };
  }

  if (!to || !fires?.length) {
    return {
      sent: false,
      skipped: true,
      reason: 'No recipient or fires to email.',
    };
  }

  const resend = new Resend(env.resendApiKey);
  const firstFire = fires[0];
  const subject = `Wildfire alert near ${firstFire.location || origin?.label || 'your location'}`;

  const result = await resend.emails.send({
    from: env.alertFromEmail,
    to,
    subject,
    html: buildWildfireAlertHtml({ user, fires, origin, radius }),
  });

  return {
    sent: true,
    provider: 'resend',
    id: result?.data?.id || result?.id || null,
  };
};

module.exports = {
  sendWildfireAlertEmail,
};
