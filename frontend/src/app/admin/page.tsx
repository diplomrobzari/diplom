'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/review");
  }, [router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="text-sm text-gray-500">Перенаправление...</div>
    </main>
  );
}
