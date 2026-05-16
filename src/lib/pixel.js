// Wrapper seguro del Meta Pixel — no-op si fbq no está disponible aún
const fire = (...args) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
};

export const pixelContact        = ()                      => fire('track', 'Contact');
export const pixelInitiateCheckout = (numItems)            => fire('track', 'InitiateCheckout', { num_items: numItems, currency: 'COP' });
export const pixelViewContent    = (name, price)           => fire('track', 'ViewContent',      { content_name: name, content_type: 'service', value: price, currency: 'COP' });
export const pixelLead           = (name)                  => fire('track', 'Lead',             { content_name: name, content_type: 'service' });
