'use client'

import { useEffect, useRef, useState } from 'react'
import { mountKitNewsletter } from '@/lib/newsletter'

export function KitNewsletterForm({ locale, fallbackUrl }: {
  locale: 'ar' | 'en'
  fallbackUrl: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!host.current) return
    setState('loading')
    return mountKitNewsletter(host.current, { locale, onStateChange: setState })
  }, [locale])

  const openLabel = locale === 'ar' ? 'فتح صفحة الاشتراك' : 'Open subscription page'
  return (
    <div className="sr-newsletter-form" data-state={state}>
      <div ref={host} className="sr-newsletter-embed" />
      {state === 'loading' && <p className="sr-newsletter-loading" role="status">{locale === 'ar' ? 'جارٍ تحميل نموذج الاشتراك…' : 'Loading subscription form…'}</p>}
      {state === 'error' && <a className="sr-newsletter-fallback" href={fallbackUrl} target="_blank" rel="noopener noreferrer">{openLabel}</a>}
      <noscript><a className="sr-newsletter-fallback" href={fallbackUrl}>{openLabel}</a></noscript>
      <p className="sr-newsletter-privacy">{locale === 'ar' ? 'بدون رسائل مزعجة، ويمكنك إلغاء الاشتراك في أي وقت.' : 'No spam. Unsubscribe at any time.'}</p>
    </div>
  )
}

