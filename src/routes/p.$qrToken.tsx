import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getParticipantByToken, uploadPublicParticipantPhoto } from "@/services/api/participants";
import { BadgePreview } from "@/components/BadgePreview";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState } from "react";

export const Route = createFileRoute("/p/$qrToken")({
  head: () => ({ meta: [{ title: "Badge · CIRT" }, { name: "robots", content: "noindex" }] }),
  component: PublicBadge,
});

function PublicBadge() {
  const { qrToken } = Route.useParams();
  const q = useQuery({ queryKey: ["public-badge", qrToken], queryFn: () => getParticipantByToken(qrToken) });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadPhoto(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadPublicParticipantPhoto(qrToken, file);
      await q.refetch();
      toast.success("Photo envoyée");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload impossible");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (q.isLoading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Chargement…</div>;

  if (!q.data) {
    return (
      <div className="min-h-screen grid place-items-center bg-deep text-white p-6">
        <div className="max-w-sm text-center">
          <div className="font-turret text-2xl tracking-widest mb-3">CIRT BADGE</div>
          <h1 className="text-2xl font-display font-bold">Badge introuvable</h1>
          <p className="text-white/70 mt-2 text-sm">Ce lien est invalide ou expiré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep text-white p-6 flex flex-col items-center">
      <div className="font-turret text-xl tracking-widest opacity-80 mb-6">CIRT BADGE</div>
      <BadgePreview participant={q.data} />
      <div className="mt-6 w-full max-w-[360px] space-y-3">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
        <Button disabled={uploading} className="w-full bg-iris-lime text-primary-deep hover:opacity-90" onClick={() => inputRef.current?.click()}>
          <Camera className="size-4 mr-2" /> Ajouter ma photo
        </Button>
        <p className="text-xs text-white/60 text-center">
          Présentez ce badge à l'entrée. En cas de problème, l'agent peut saisir votre Badge ID.
        </p>
      </div>
    </div>
  );
}
