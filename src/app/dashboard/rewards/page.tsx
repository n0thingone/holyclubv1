"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  Plus,
  Sparkles,
  Coins,
  Power,
  Loader2,
  AlertCircle,
  PackageOpen,
  Image as ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  active: boolean;
  sort_order?: number | null;
};

export default function RewardsPage() {
  const supabase = getSupabaseClient();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [points, setPoints] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function loadRewards() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("holy_rewards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando rewards:", error);
      setError("No se pudieron cargar los rewards.");
      setRewards([]);
    } else {
      setRewards(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadRewards();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function resetForm() {
    setName("");
    setPoints(0);
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function uploadRewardImage(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `reward-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const filePath = `rewards/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("reward-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("reward-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function getStoragePathFromPublicUrl(url: string | null) {
    if (!url) return null;

    try {
      const marker = "/storage/v1/object/public/reward-images/";
      const index = url.indexOf(marker);

      if (index === -1) return null;

      const rawPath = url.slice(index + marker.length);
      return decodeURIComponent(rawPath);
    } catch (err) {
      console.error("No se pudo parsear image_url:", err);
      return null;
    }
  }

  async function createReward() {
    if (!name.trim() || points <= 0) {
      setError("Completá el nombre y un costo válido en créditos.");
      setSuccess(null);
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadRewardImage(imageFile);
      }

      const { error } = await supabase.from("holy_rewards").insert({
        name: name.trim(),
        description: description.trim() || null,
        points_cost: points,
        image_url: imageUrl,
        active: true,
      });

      if (error) throw error;

      resetForm();
      setSuccess("Reward creado correctamente.");

      await loadRewards();
    } catch (err) {
      console.error("Error creando reward:", err);
      setError("No se pudo crear el reward.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setTogglingId(id);
    setError(null);
    setSuccess(null);

    const { error } = await supabase
      .from("holy_rewards")
      .update({ active: !active })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando reward:", error);
      setError("No se pudo actualizar el estado del reward.");
      setTogglingId(null);
      return;
    }

    setTogglingId(null);
    setSuccess(
      active ? "Reward desactivado correctamente." : "Reward activado correctamente."
    );
    await loadRewards();
  }

  async function deleteReward(reward: Reward) {
    const ok = window.confirm(
      `¿Seguro que querés eliminar "${reward.name}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;

    setDeletingId(reward.id);
    setError(null);
    setSuccess(null);

    try {
      const storagePath = getStoragePathFromPublicUrl(reward.image_url);

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("reward-images")
          .remove([storagePath]);

        if (storageError) {
          console.warn("No se pudo borrar la imagen del storage:", storageError);
        }
      }

      const { error: deleteError } = await supabase
        .from("holy_rewards")
        .delete()
        .eq("id", reward.id);

      if (deleteError) throw deleteError;

      setRewards((prev) => prev.filter((item) => item.id !== reward.id));
      setSuccess("Reward eliminado correctamente.");
    } catch (err) {
      console.error("Error eliminando reward:", err);
      setError("No se pudo eliminar el reward.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = useMemo(
    () => rewards.filter((reward) => reward.active).length,
    [rewards]
  );

  const inactiveCount = useMemo(
    () => rewards.filter((reward) => !reward.active).length,
    [rewards]
  );

  return (
    <DashboardShell title="HOLY · REWARDS">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-24">
        <section className="relative w-full overflow-hidden rounded-[32px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_0_70px_rgba(168,85,247,0.18)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.15))]" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
              <Gift className="h-3.5 w-3.5" />
              Rewards HOLY
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Gestionar recompensas
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                  Creá beneficios, subí imagen, definí el costo en créditos y
                  activá, desactivá o eliminá lo que querés mostrar en la app.
                </p>
              </div>

              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-black/20 text-fuchsia-300 sm:flex">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Total rewards
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {rewards.length}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
                  Activos
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-red-200/70">
                  Inactivos
                </p>
                <p className="mt-2 text-3xl font-black text-red-300">
                  {inactiveCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <section className="w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">Crear reward</h2>
              <p className="text-sm text-white/50">
                Cargá una nueva recompensa y opcionalmente subile una imagen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Nombre
              </label>
              <input
                placeholder="Ej: Pinta 500 cc"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-500/30"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Créditos
              </label>
              <input
                placeholder="3000"
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-500/30"
              />
            </div>

            <div className="md:col-span-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Descripción
              </label>
              <input
                placeholder="Ej: Canjeable en barra"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-500/30"
              />
            </div>

            <div className="md:col-span-12">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Imagen
              </label>

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                  <Upload className="h-4 w-4" />
                  Seleccionar imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageFile(file);
                    }}
                  />
                </label>

                {imageFile ? (
                  <span className="text-sm text-white/60">{imageFile.name}</span>
                ) : (
                  <span className="text-sm text-white/35">
                    Sin imagen seleccionada
                  </span>
                )}
              </div>

              {imagePreview ? (
                <div className="mt-4 h-36 w-36 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img
                    src={imagePreview}
                    alt="Preview reward"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-white/35">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="md:col-span-12">
              <button
                onClick={createReward}
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(217,70,239,0.22)] transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear reward
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="w-full space-y-4">
          <div>
            <h2 className="text-xl font-black text-white">Rewards cargados</h2>
            <p className="text-sm text-white/50">
              Activá, desactivá o eliminá los beneficios disponibles en la app.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
              Cargando rewards...
            </div>
          ) : rewards.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/60">
                <PackageOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-black text-white">
                No hay rewards cargados
              </h3>
              <p className="mt-2 text-sm text-white/50">
                Creá el primero y empezá a armar los canjes de HOLY.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => {
                const isToggling = togglingId === reward.id;
                const isDeleting = deletingId === reward.id;
                const isBusy = isToggling || isDeleting;

                return (
                  <article
                    key={reward.id}
                    className={`w-full rounded-[30px] border p-5 md:p-6 shadow-[0_14px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl ${
                      reward.active
                        ? "border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.03))]"
                        : "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
                    }`}
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          {reward.image_url ? (
                            <img
                              src={reward.image_url}
                              alt={reward.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/40">
                              <Gift className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 pr-0 sm:pr-4">
                              <h3 className="text-xl font-black leading-tight text-white whitespace-normal break-words">
                                {reward.name}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-white/60 whitespace-normal break-words">
                                {reward.description || "Sin descripción"}
                              </p>
                            </div>

                            <span
                              className={`w-fit shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                                reward.active
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border border-red-500/30 bg-red-500/10 text-red-300"
                              }`}
                            >
                              {reward.active ? "ACTIVO" : "INACTIVO"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-[260px] md:shrink-0">
                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center gap-2 text-white/45">
                            <Coins className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Costo en créditos
                            </span>
                          </div>

                          <p className="mt-3 text-3xl font-black leading-none text-white sm:text-4xl">
                            {reward.points_cost.toLocaleString("es-AR")}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-white/55">
                            créditos
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <button
                            onClick={() => toggleActive(reward.id, reward.active)}
                            disabled={isBusy}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                              reward.active
                                ? "border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                                : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}

                            {reward.active ? "Desactivar reward" : "Activar reward"}
                          </button>

                          <button
                            onClick={() => deleteReward(reward)}
                            disabled={isBusy}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Eliminar reward
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}