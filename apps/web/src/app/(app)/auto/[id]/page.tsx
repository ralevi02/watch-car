import { redirect } from "next/navigation";

/** Links antiguos: el detalle ahora es /auto?id=, una página fija que lee del teléfono. */
export default async function AutoAntiguo({ params }: PageProps<"/auto/[id]">) {
  redirect(`/auto?id=${encodeURIComponent((await params).id)}`);
}
