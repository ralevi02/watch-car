import { Suspense } from "react";
import { VistaResultados } from "@/components/vista-resultados";

export default function Resultados() {
  return (
    <Suspense>
      <VistaResultados />
    </Suspense>
  );
}
