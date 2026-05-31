import localFont from "next/font/local";

// Primary default font (CMGeom)
export const geom = localFont({
  src: "../../assets/fonts/CMGeom-Regular.woff2",
  variable: "--font-geom",
  display: "swap",
});

// Accent font (Sinistre Variable Font)
export const sinistre = localFont({
  src: "../../assets/fonts/SinistreVF.woff2",
  variable: "--font-sinistre",
  display: "swap",
});

