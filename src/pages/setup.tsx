import CreateIngressForm from "@/components/setup/CreateIngressForm";
import DeleteIngressesForm from "@/components/setup/DeleteIngressesForm";

export default function SetupPage() {
  return (
    <section className="container mx-auto grid items-center gap-6 space-y-10 pt-6 pb-8 md:py-10">
      <CreateIngressForm />
      <DeleteIngressesForm />
    </section>
  );
}
