import { Suspense } from "react";
import { DetalleAuto } from "@/components/detalle-auto";

export default function Auto() {
  return (
    <Suspense>
      <DetalleAuto />
    </Suspense>
  );
}
