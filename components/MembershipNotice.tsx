"use client";

type Props = {
  locale: "ar" | "en";
  limit: number;
  loginUrl: string;
  registerUrl: string;
};

export default function MembershipNotice({ locale, limit, loginUrl, registerUrl }: Props) {
  const isAr = locale === "ar";
  return (
    <section className="sr-membership-notice" role="note">
      <div>
        <strong>{isAr ? `عرض عام: أحدث ${limit} فرص` : `Public preview: latest ${limit} opportunities`}</strong>
        <p>
          {isAr
            ? "أنشئ حساباً مجانياً للاطلاع على بقية المناقصات والفرص المنشورة. إنشاء الحساب المجاني لا يتطلب أي دفع."
            : "Create a free account to access the remaining published tenders and opportunities. A Free account requires no payment."}
        </p>
      </div>
      <div className="sr-membership-actions">
        <a className="sr-membership-primary" href={registerUrl}>{isAr ? "إنشاء حساب مجاني" : "Create free account"}</a>
        <a className="sr-membership-secondary" href={loginUrl}>{isAr ? "تسجيل الدخول" : "Sign in"}</a>
      </div>
    </section>
  );
}
