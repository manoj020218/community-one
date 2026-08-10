import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = 'https://community.iotsoft.in';
const DEFAULT_IMAGE = `${SITE_URL}/pwa-512x512.png`;

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Sets per-route <title>, meta description/keywords, canonical link, Open Graph,
// Twitter card tags and optional JSON-LD — since this is a client-rendered SPA
// with a single static index.html, these only exist if set at runtime per route.
export function Seo({ title, description, keywords, path, structuredData }: SeoProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`;
    document.title = title;

    setMetaTag('name', 'description', description);
    if (keywords?.length) setMetaTag('name', 'keywords', keywords.join(', '));
    setMetaTag('name', 'robots', 'index, follow');

    setLinkTag('canonical', canonicalUrl);

    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:image', DEFAULT_IMAGE);
    setMetaTag('property', 'og:site_name', 'Jenix Community One');
    setMetaTag('property', 'og:locale', 'en_IN');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', DEFAULT_IMAGE);

    let ldScript: HTMLScriptElement | null = null;
    if (structuredData) {
      ldScript = document.createElement('script');
      ldScript.type = 'application/ld+json';
      ldScript.text = JSON.stringify(structuredData);
      document.head.appendChild(ldScript);
    }

    return () => {
      if (ldScript) document.head.removeChild(ldScript);
    };
  }, [title, description, keywords, path, structuredData]);

  return null;
}
