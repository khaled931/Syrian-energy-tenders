"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("تم نسخ الرابط");
      setTimeout(() => setMessage(""), 1800);
    } catch {
      setMessage("تعذر تنفيذ المشاركة");
      setTimeout(() => setMessage(""), 1800);
    }
  }

  return (
    <div className="sr-share-wrap">
      <button className="sr-button sr-button--primary" type="button" onClick={handleShare}>
        مشاركة المناقصة
      </button>
      {message ? <span className="sr-share-message">{message}</span> : null}
    </div>
  );
}
