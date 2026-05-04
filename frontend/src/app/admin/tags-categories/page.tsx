'use client';

import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../../../lib/api";
import { Category, Tag } from "../../../types";

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

export default function AdminTagsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);

  const load = async () => {
    try {
      const [cats, tgs] = await Promise.all([
        apiFetch<Category[]>("/categories"),
        apiFetch<Tag[]>("/tags"),
      ]);
      setCategories(cats);
      setTags(tgs);
      setCategoryPage(1);
      setTagPage(1);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const token = getToken();

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    setProcessing(true);
    try {
      const created = await apiFetch<Category>("/admin/categories", {
        method: "POST",
        token,
        body: { name },
      });
      setCategories((prev) => [...prev, created]);
      setNewCategory("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка создания категории");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTag.trim();
    if (!name) return;
    setProcessing(true);
    try {
      const created = await apiFetch<Tag>("/admin/tags", {
        method: "POST",
        token,
        body: { name },
      });
      setTags((prev) => [...prev, created]);
      setNewTag("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка создания тега");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    const name = editValue.trim();
    if (!name) return;
    setProcessing(true);
    try {
      const updated = await apiFetch<Category>(`/admin/categories/${id}`, {
        method: "PUT",
        token,
        body: { name },
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingCategory(null);
      setEditValue("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка обновления категории");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateTag = async (id: number) => {
    const name = editValue.trim();
    if (!name) return;
    setProcessing(true);
    try {
      const updated = await apiFetch<Tag>(`/admin/tags/${id}`, {
        method: "PUT",
        token,
        body: { name },
      });
      setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingTag(null);
      setEditValue("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка обновления тега");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Удалить категорию?")) return;
    setProcessing(true);
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "DELETE", token });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления категории");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm("Удалить тег?")) return;
    setProcessing(true);
    try {
      await apiFetch(`/admin/tags/${id}`, { method: "DELETE", token });
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления тега");
    } finally {
      setProcessing(false);
    }
  };

  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / ITEMS_PER_PAGE));
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const visibleCategories = categories.slice(
    (safeCategoryPage - 1) * ITEMS_PER_PAGE,
    safeCategoryPage * ITEMS_PER_PAGE
  );

  const totalTagPages = Math.max(1, Math.ceil(tags.length / ITEMS_PER_PAGE));
  const safeTagPage = Math.min(tagPage, totalTagPages);
  const visibleTags = tags.slice(
    (safeTagPage - 1) * ITEMS_PER_PAGE,
    safeTagPage * ITEMS_PER_PAGE
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold uppercase text-[#7D39EB]">Категории</h2>

        <form onSubmit={handleAddCategory} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Название категории"
            className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-[#7D39EB] focus:outline-none"
            disabled={processing}
          />
          <button
            type="submit"
            disabled={processing || !newCategory.trim()}
            className="btn-primary px-6 py-3"
          >
            Добавить
          </button>
        </form>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7D39EB] border-t-[#C6FF33]" />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                {editingCategory === cat.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-1 text-sm focus:border-[#7D39EB] focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleUpdateCategory(cat.id)} className="btn-primary px-3 py-1 text-sm">
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setEditValue("");
                      }}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat.id);
                          setEditValue(cat.name);
                        }}
                        className="btn-secondary px-3 py-1 text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="btn-danger px-3 py-1 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <p className="text-center text-sm text-gray-500">Нет категорий</p>}
            <Pager page={safeCategoryPage} totalPages={totalCategoryPages} onChange={setCategoryPage} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold uppercase text-[#7D39EB]">Теги</h2>

        <form onSubmit={handleAddTag} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Название тега"
            className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-[#7D39EB] focus:outline-none"
            disabled={processing}
          />
          <button
            type="submit"
            disabled={processing || !newTag.trim()}
            className="btn-primary px-6 py-3"
          >
            Добавить
          </button>
        </form>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7D39EB] border-t-[#C6FF33]" />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                {editingTag === tag.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-1 text-sm focus:border-[#7D39EB] focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleUpdateTag(tag.id)} className="btn-primary px-3 py-1 text-sm">
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setEditingTag(null);
                        setEditValue("");
                      }}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">#{tag.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTag(tag.id);
                          setEditValue(tag.name);
                        }}
                        className="btn-secondary px-3 py-1 text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="btn-danger px-3 py-1 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {tags.length === 0 && <p className="text-center text-sm text-gray-500">Нет тегов</p>}
            <Pager page={safeTagPage} totalPages={totalTagPages} onChange={setTagPage} />
          </div>
        )}
      </div>
    </div>
  );
}
