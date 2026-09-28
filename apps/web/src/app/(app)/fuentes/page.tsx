import { Suspense } from "react";
import { VistaFuentes } from "@/components/vista-fuentes";

export default function Fuentes() {
  return (
    <Suspense>
      <VistaFuentes />
    </Suspense>
  );
}
