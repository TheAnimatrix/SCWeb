export type EmailLayoutOptions = {
	siteUrl: string;
	siteName?: string;
	supportEmail?: string;
	preheader?: string;
	title: string;
	bodyHtml: string;
	cta?: { label: string; href: string };
};

export const BRAND = {
	bg: '#f4f4f5',
	card: '#ffffff',
	text: '#171717',
	muted: '#737373',
	border: '#e5e5e5',
	accent: '#00c9a7',
	accentText: '#0a0a0a',
	ctaBg: '#0a0a0a',
	ctaText: '#ffffff'
};

export function renderEmailLayout(options: EmailLayoutOptions): { html: string; text: string } {
	const siteName = options.siteName ?? 'Selfcrafted India';
	const supportEmail = options.supportEmail ?? 'support@selfcrafted.in';
	const logoUrl = `${options.siteUrl}/pwa/pwa-512.png`;
	const preheader = options.preheader ?? options.title;

	const ctaHtml = options.cta
		? `<tr>
				<td align="center" style="padding:28px 28px 8px;text-align:center;">
					<a href="${escapeHtml(options.cta.href)}" style="display:inline-block;background:${BRAND.ctaBg};color:${BRAND.ctaText};font-family:ui-monospace,monospace;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:6px;">
						${escapeHtml(options.cta.label)}
					</a>
				</td>
			</tr>`
		: '';

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	<title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:'Figtree',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:32px 16px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
					<tr>
						<td style="padding:28px 28px 12px;text-align:center;">
							<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="56" height="56" style="display:block;margin:0 auto 16px;border-radius:12px;" />
							<p style="margin:0;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(siteName)}</p>
						</td>
					</tr>
					<tr>
						<td style="padding:8px 28px 0;">
							<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:600;color:${BRAND.text};">${escapeHtml(options.title)}</h1>
							<div style="font-size:15px;line-height:1.6;color:${BRAND.text};">${options.bodyHtml}</div>
						</td>
					</tr>
					${ctaHtml}
					<tr>
						<td style="padding:24px 28px 28px;border-top:1px solid ${BRAND.border};margin-top:24px;text-align:center;">
							<p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};">
								Questions? Reply to <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND.accent};text-decoration:none;">${escapeHtml(supportEmail)}</a>
							</p>
							<p style="margin:8px 0 0;font-size:11px;color:${BRAND.muted};">
								<a href="${escapeHtml(options.siteUrl)}" style="color:${BRAND.muted};text-decoration:none;">${escapeHtml(options.siteUrl.replace(/^https?:\/\//, ''))}</a>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;

	const text = [
		options.title,
		'',
		stripHtml(options.bodyHtml),
		options.cta ? `\n${options.cta.label}: ${options.cta.href}` : '',
		'',
		`Questions? ${supportEmail}`,
		options.siteUrl
	]
		.filter(Boolean)
		.join('\n');

	return { html, text };
}

export function renderLabelValue(label: string, value: string): string {
	return `<p style="margin:0 0 12px;">
		<span style="display:block;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:4px;">${escapeHtml(label)}</span>
		<span style="color:${BRAND.text};">${escapeHtml(value)}</span>
	</p>`;
}

export function renderParagraph(text: string): string {
	return `<p style="margin:0 0 12px;color:${BRAND.text};">${escapeHtml(text)}</p>`;
}

export function renderPreviewImage(dataUri: string, alt: string): string {
	if (!dataUri.startsWith('data:image/')) {
		return '';
	}

	return `<div style="margin:0 0 16px;text-align:center;">
		<img src="${dataUri}" alt="${escapeHtml(alt)}" width="280" style="display:block;margin:0 auto;max-width:100%;height:auto;border-radius:8px;border:1px solid ${BRAND.border};background:${BRAND.bg};" />
	</div>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
