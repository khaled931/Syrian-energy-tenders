"use client";

import { useState } from "react";
import type { PlatformLocale } from "@/lib/platform";

export default function ShareButton({ title, locale }: { title: string; locale: PlatformLocale }) {
  const [message, setMessage] = useState("");
  const isArabic = locale === "ar";

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage(isArabic ? "تم نسخ الرابط" : "Link copied");
      setTimeout(() => setMessage(""), 1800);
    } catch {
      setMessage(isArabic ? "تعذر تنفيذ المشاركة" : "Unable to share");
      setTimeout(() => setMessage(""), 1800);
    }
  }

  return (
    <div className="sr-share-wrap">
      <button className="sr-button sr-button--primary" type="button" onClick={handleShare}>
        {isArabic ? "مشاركة المناقصة" : "Share tender"}
      </button>
      {message ? <span className="sr-share-message">{message}</span> : null}
    </div>
  );
}
