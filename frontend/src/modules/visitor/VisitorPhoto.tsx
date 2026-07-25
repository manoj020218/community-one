import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface VisitorPhotoProps {
  requestId: string;
  societyId: string;
  alt: string;
  className?: string;
}

/**
 * Fetches a visitor photo through the authenticated /visitor/requests/:id/photo
 * endpoint (Bearer token, not a public URL) and renders it as a blob object URL.
 */
export function VisitorPhoto({ requestId, societyId, alt, className }: VisitorPhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    api
      .get(`/visitor/requests/${requestId}/photo`, { params: { societyId }, responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        // No photo, or access denied — render nothing rather than a broken image.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestId, societyId]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
