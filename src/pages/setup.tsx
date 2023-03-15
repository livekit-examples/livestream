import CreateIngressForm from "@/components/setup/CreateIngressForm";
import DeleteIngressesForm from "@/components/setup/DeleteIngressesForm";
import { env } from "@/env.mjs";

export default function SetupPage() {
  return (
    <section className="container mx-auto flex flex-1 flex-col items-start gap-10 space-y-10 px-5 pt-6 pb-8 md:py-10">
      <CreateIngressForm />
      {Number(env.NEXT_PUBLIC_ENABLE_DANGER_ZONE) ? (
        <DeleteIngressesForm />
      ) : null}
    </section>
  );
}
