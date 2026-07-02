const socialLinks = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/syrianrenewables/",
    className: "sr-social-link--linkedin",
    icon: "in",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/syrianrenewables",
    className: "sr-social-link--facebook",
    icon: "f",
  },
  {
    name: "X",
    href: "https://x.com/SyrianRenew",
    className: "sr-social-link--x",
    icon: "𝕏",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/syrianrenewables/",
    className: "sr-social-link--instagram",
    icon: "◎",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UCRWZ3b0AR9QcYcsRMRZs68w",
    className: "sr-social-link--youtube",
    icon: "▶",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@syrianrenewables?_r=1&_t=ZN-977WRXV1gak",
    className: "sr-social-link--tiktok",
    icon: "♪",
  },
  {
    name: "WhatsApp",
    href: "https://whatsapp.com/channel/0029VayODloK5cD9gUAPoj0m",
    className: "sr-social-link--whatsapp",
    icon: "☎",
  },
  {
    name: "Email",
    href: "mailto:khaled.alassad@syrianrenewables.com",
    className: "sr-social-link--email",
    icon: "@",
  },
];

export default function SiteFooter() {
  return (
    <footer className="sr-site-footer" aria-label="روابط منصة Syrian Renewables">
      <div className="sr-site-footer__inner">
        <div className="sr-site-footer__text">
          <strong>Syrian Renewables</strong>
          <span>تابع منصة بوابة الطاقة المتجددة في سورية</span>
        </div>
        <nav className="sr-social-links" aria-label="حسابات التواصل الاجتماعي">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              className={`sr-social-link ${link.className}`}
              href={link.href}
              target={link.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              aria-label={link.name}
              title={link.name}
            >
              <span aria-hidden="true">{link.icon}</span>
              <em>{link.name}</em>
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
