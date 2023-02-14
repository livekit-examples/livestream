import { Button } from "@/components/ui";
import { api } from "@/lib/api";

export default function DeleteIngressesForm() {
  const deleteIngresses = api.ingress.deleteAll.useMutation();

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-4 rounded border border-red-300 bg-red-100 p-4 dark:bg-red-200 sm:w-[350px]">
      <h3 className="text-center text-sm font-bold uppercase text-red-700 dark:text-black">
        🚨 Danger Zone 🚨
      </h3>
      <Button
        variant="destructive"
        size="sm"
        disabled={deleteIngresses.isLoading}
        onClick={() => deleteIngresses.mutate()}
      >
        Reset all RTMP endpoints
      </Button>
      {deleteIngresses.isSuccess && (
        <div className="text-center text-sm text-red-700 dark:text-black">
          All RTMP endpoints have been deleted.
        </div>
      )}
    </div>
  );
}
