'use client';

import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../../../lib/api";
import { prepareImageForUpload } from "../../../lib/imageUpload";
import { AdminProfileCustomizationItem } from "../../../types";

const ITEMS_PER_PAGE = 10;

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-xl border-2 border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
      >
        ←
      </button>
      <span className="text-xs font-medium text-gray-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-xl border-2 border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
      >
        →
      </button>
    </div>
  );
}

export default function AdminCustomizationsPage() {
  const [items, setItems] = useState<AdminProfileCustomizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newType, setNewType] = useState<"frame" | "background">("frame");
  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [framePage, setFramePage] = useState(1);
  const [backgroundPage, setBackgroundPage] = useState(1);

  const token = getToken();

  const load = async () => {
    try {
      const data = await apiFetch<AdminProfileCustomizationItem[]>("/admin/customizations", { token });
      setItems(data);
      setFramePage(1);
      setBackgroundPage(1);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка загрузки кастомизации");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newFile) return;
    setProcessing(true);
    try {
      const preparedFile = await prepareImageForUpload(newFile, {
        maxWidth: newType === "background" ? 1920 : 1024,
        maxHeight: newType === "background" ? 1080 : 1024,
        cropAspectRatio: newType === "background" ? 16 / 9 : undefined,
      });
      const form = new FormData();
      form.append("type", newType);
      form.append("name", newName.trim());
      form.append("file", preparedFile);
      await apiFetch("/admin/customizations", { method: "POST", token, body: form });
      setNewName("");
      setNewFile(null);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка добавления");
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (item: AdminProfileCustomizationItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingFile(null);
  };

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) return;
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("name", editingName.trim());
      if (editingFile) {
        const currentItem = items.find((item) => item.id === id);
        const preparedFile = await prepareImageForUpload(editingFile, {
          maxWidth: currentItem?.type === "background" ? 1920 : 1024,
          maxHeight: currentItem?.type === "background" ? 1080 : 1024,
          cropAspectRatio: currentItem?.type === "background" ? 16 / 9 : undefined,
        });
        form.append("file", preparedFile);
      }
      form.append("_method", "PUT");
      await apiFetch(`/admin/customizations/${id}`, { method: "POST", token, body: form });
      setEditingId(null);
      setEditingName("");
      setEditingFile(null);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить элемент кастомизации? Последующие уровни сместятся на 1 шаг.")) return;
    setProcessing(true);
    try {
      await apiFetch(`/admin/customizations/${id}`, { method: "DELETE", token });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setProcessing(false);
    }
  };

  const frames = items
    .filter((i) => i.type === "frame")
    .sort((a, b) => a.required_tasks - b.required_tasks);
  const backgrounds = items
    .filter((i) => i.type === "background")
    .sort((a, b) => a.required_tasks - b.required_tasks);

  const totalFramePages = Math.max(1, Math.ceil(frames.length / ITEMS_PER_PAGE));
  const safeFramePage = Math.min(framePage, totalFramePages);
  const visibleFrames = frames.slice(
    (safeFramePage - 1) * ITEMS_PER_PAGE,
    safeFramePage * ITEMS_PER_PAGE
  );

  const totalBackgroundPages = Math.max(1, Math.ceil(backgrounds.length / ITEMS_PER_PAGE));
  const safeBackgroundPage = Math.min(backgroundPage, totalBackgroundPages);
  const visibleBackgrounds = backgrounds.slice(
    (safeBackgroundPage - 1) * ITEMS_PER_PAGE,
    safeBackgroundPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-bold uppercase text-[#7D39EB]">Кастомизация профиля</h2>
        <p className="text-sm text-gray-600">
          Новые фоны добавляются по четным шагам достижений, рамки — по нечетным.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[#7D39EB]">Добавить элемент</h3>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "frame" | "background")}
            className="rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
          >
            <option value="frame">Рамка</option>
            <option value="background">Фон</option>
          </select>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название"
            className="rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
          />
          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#7D39EB]">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {newFile ? "Файл выбран" : "Выбрать файл"}
          </label>
          <button type="submit" disabled={processing || !newName.trim() || !newFile} className="btn-primary">
            Добавить
          </button>
        </form>
        {newFile && <p className="mt-2 text-xs text-gray-500">Выбран файл: {newFile.name}</p>}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7D39EB] border-t-[#C6FF33]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#7D39EB]">Рамки</h3>
            <div className="space-y-3">
              {visibleFrames.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-700">За {item.required_tasks} достижений</span>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(item)} className="btn-secondary px-3 py-1 text-xs">Изменить</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-danger px-3 py-1 text-xs">Удалить</button>
                    </div>
                  </div>
                  <img src={item.asset_path} alt={item.name} className="mb-2 h-20 w-20 rounded-lg border border-gray-200 object-contain" />
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                      />
                      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#7D39EB]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditingFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        {editingFile ? "Новый файл выбран" : "Выбрать новый файл"}
                      </label>
                      {editingFile && <p className="text-xs text-gray-500">{editingFile.name}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(item.id)} className="btn-primary px-3 py-1 text-xs">Сохранить</button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary px-3 py-1 text-xs">Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{item.name}</p>
                  )}
                </div>
              ))}
              {frames.length === 0 && <p className="text-sm text-gray-500">Пока нет рамок.</p>}
              <Pager page={safeFramePage} totalPages={totalFramePages} onChange={setFramePage} />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#7D39EB]">Фоны</h3>
            <div className="space-y-3">
              {visibleBackgrounds.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-700">За {item.required_tasks} достижений</span>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(item)} className="btn-secondary px-3 py-1 text-xs">Изменить</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-danger px-3 py-1 text-xs">Удалить</button>
                    </div>
                  </div>
                  <img
                    src={item.asset_path}
                    alt={item.name}
                    className="mb-2 h-16 w-32 rounded-lg border border-gray-200 object-cover"
                  />
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                      />
                      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#7D39EB]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditingFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        {editingFile ? "Новый файл выбран" : "Выбрать новый файл"}
                      </label>
                      {editingFile && <p className="text-xs text-gray-500">{editingFile.name}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(item.id)} className="btn-primary px-3 py-1 text-xs">Сохранить</button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary px-3 py-1 text-xs">Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{item.name}</p>
                  )}
                </div>
              ))}
              {backgrounds.length === 0 && <p className="text-sm text-gray-500">Пока нет фонов.</p>}
              <Pager page={safeBackgroundPage} totalPages={totalBackgroundPages} onChange={setBackgroundPage} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
