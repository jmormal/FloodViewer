export function Footer() {
  const logos = [
    { href: "https://iiama.upv.es/", src: "/img/iiama_logo.png", alt: "IIAMA logo" },
    { href: "https://vrain.upv.es/", src: "/img/vrain_white_1.png", alt: "VRAIN logo" },
    { href: "https://pgtec-vrain.github.io/", src: "/img/logo_upv2.png", alt: "PGTEC VRAIN logo" },
    { href: "https://avance.digital.gob.es/", src: "/img/logo_MTDFP-SEDIA.png", alt: "SEDIA" },
    { href: "https://next-generation-eu.europa.eu/", src: "/img/logo_eu.png", alt: "NextGenerationEU" },
    { href: "https://cindi.gva.es/", src: "/img/logo_PRTR_3.png", alt: "GVA Logo" },
  ];

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {logos.map(({ href, src, alt }) => (
          <a key={alt} href={href} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={alt} className="h-8 object-contain opacity-80 hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </footer>
  );
}
