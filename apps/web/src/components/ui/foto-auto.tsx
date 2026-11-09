"use client";

import { Car } from "lucide-react";
import { useState, type ImgHTMLAttributes } from "react";

/** Foto de un aviso; si no hay o no carga (link vencido del portal), muestra el ícono del auto. */
export function FotoAuto({ src, icono = "size-9", className, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null; icono?: string }) {
  const [caida, setCaida] = useState<string | null>(null);
  if (!src || caida === src)
    return (
      <span className="flex size-full items-center justify-center text-tenue">
        <Car className={icono} strokeWidth={1.3} />
      </span>
    );
  return <img src={src} alt="" {...props} onError={() => setCaida(src)} className={className} />;
}
