'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken } from "../../../lib/api";

type StatsResponse = {
  users_count: number;
  competitions_count: number;
  participations_count: number;
  competitions_by_status: Record<string, number>;
  competitions_last_period: Record<string, number>;
  participations_last_period: Record<string, number>;
  top_categories: { name: string; count: number }[];
  top_tags: { name: string; count: number }[];
  start_date: string;
  end_date: string;
};

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<"day" | "week" | "month" | "year">("week");
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const end = new Date();
        const start = new Date(end);
        switch (periodType) {
          case "day": break;
          case "week": start.setDate(end.getDate() - 6); break;
          case "month": start.setMonth(end.getMonth() - 1); break;
          case "year": start.setFullYear(end.getFullYear() - 1); break;
        }
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const params = new URLSearchParams();
        params.set("start_date", fmt(start));
        params.set("end_date", fmt(end));
        const data = await apiFetch<StatsResponse>(`/admin/stats?${params.toString()}`, { token });
        setStats(data);
        setError(null);
      } catch (e: any) {
        setError(e.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [periodType]);

  // Построение графика
  useEffect(() => {
    if (!stats || !chartRef.current) return;

    // Очищаем предыдущий график
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Форматируем даты для отображения (ДД.ММ)
    const labels = Object.keys(stats.competitions_last_period).map(dateStr => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    });
    const competitionsData = Object.values(stats.competitions_last_period);
    const participationsData = Object.values(stats.participations_last_period);

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Динамический импорт Chart.js
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default;
      
      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Объявления',
              data: competitionsData,
              borderColor: '#7D39EB',
              backgroundColor: 'rgba(125, 57, 235, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#7D39EB',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Участия',
              data: participationsData,
              borderColor: '#C6FF33',
              backgroundColor: 'rgba(198, 255, 51, 0.1)',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#C6FF33',
              pointBorderColor: '#7D39EB',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                font: {
                  size: 12,
                  weight: 600,
                },
              },
            },
            tooltip: {
              backgroundColor: '#7D39EB',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                title: function(context) {
                  const index = context[0].dataIndex;
                  const fullDate = Object.keys(stats.competitions_last_period)[index];
                  const date = new Date(fullDate);
                  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { 
                color: '#666',
                stepSize: 1,
              },
            },
            x: {
              grid: { display: false },
              ticks: { color: '#666' },
            },
          },
        },
      });
    }).catch((err) => {
      console.error('Ошибка загрузки Chart.js:', err);
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [stats, periodType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
        <p className="text-gray-600">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#7D39EB] to-black text-white rounded-2xl p-6 shadow-lg">
          <div className="text-sm font-medium uppercase tracking-wide opacity-80 mb-2">Пользователей</div>
          <div className="text-4xl font-black">{stats.users_count}</div>
        </div>
        <div className="bg-gradient-to-br from-[#7D39EB] to-black text-white rounded-2xl p-6 shadow-lg">
          <div className="text-sm font-medium uppercase tracking-wide opacity-80 mb-2">Объявлений</div>
          <div className="text-4xl font-black">{stats.competitions_count}</div>
        </div>
        <div className="bg-gradient-to-br from-[#7D39EB] to-black text-white rounded-2xl p-6 shadow-lg">
          <div className="text-sm font-medium uppercase tracking-wide opacity-80 mb-2">Участий</div>
          <div className="text-4xl font-black">{stats.participations_count}</div>
        </div>
      </div>

      {/* График */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#7D39EB] uppercase">Динамика</h3>
          {stats && (
            <p className="text-sm text-gray-600">
              {new Date(stats.start_date).toLocaleDateString('ru-RU')} — {new Date(stats.end_date).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
        <div className="h-64">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* Период */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-[#7D39EB] uppercase mb-4">Период</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "day", label: "День" },
            { value: "week", label: "Неделя" },
            { value: "month", label: "Месяц" },
            { value: "year", label: "Год" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriodType(item.value as any)}
              className={`px-6 py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                periodType === item.value
                  ? "bg-[#7D39EB] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* По статусам */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-[#7D39EB] uppercase mb-4">По статусам</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.competitions_by_status).map(([status, count]) => {
            const statusLabels: Record<string, string> = {
              'pending_review': 'На рассмотрении',
              'recruiting': 'Набор участников',
              'upcoming': 'Скоро состоится',
              'live': 'В процессе',
              'finished': 'Завершено',
              'closed': 'Набор завершен',
            };
            const label = statusLabels[status] || status.replace('_', ' ');
            
            return (
              <div key={status} className="rounded-xl border-2 border-gray-200 p-4">
                <div className="text-sm text-gray-500 capitalize mb-1">{label}</div>
                <div className="text-2xl font-bold text-[#7D39EB]">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Топ категорий */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-[#7D39EB] uppercase mb-4">Топ категорий</h3>
        {stats.top_categories.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет данных</p>
        ) : (
          <div className="space-y-3">
            {stats.top_categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <span className="px-3 py-1 bg-[#7D39EB] text-white rounded-full text-sm font-bold">{cat.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Топ тегов */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-[#7D39EB] uppercase mb-4">Топ тегов</h3>
        {stats.top_tags.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет данных</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.top_tags.map((tag, i) => (
              <span key={i} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                #{tag.name} <span className="text-[#7D39EB] font-bold ml-1">{tag.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
