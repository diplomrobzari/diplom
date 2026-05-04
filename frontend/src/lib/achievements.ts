import type { UserAchievement } from "../types";

/** Порядок достижений: Победитель, Серебро, Бронза, Участник */
export const ACHIEVEMENT_ORDER: string[] = [
  "first_place",
  "second_place",
  "third_place",
  "participations",
];

/** Цвет полоски прогресса по коду достижения */
export function getAchievementBarColor(code: string): string {
  switch (code) {
    case "first_place":
      return "bg-amber-400"; // золотая
    case "second_place":
      return "bg-gray-500"; // серебряная
    case "third_place":
      return "bg-amber-800"; // коричневая
    case "participations":
    default:
      return "bg-blue-500"; // синяя
  }
}

/** Сортировка user_achievements в нужном порядке */
export function sortUserAchievements(
  list: (UserAchievement & { achievement?: { code?: string } })[]
): (UserAchievement & { achievement?: { code?: string } })[] {
  return [...list].sort((a, b) => {
    const indexA = ACHIEVEMENT_ORDER.indexOf(a.achievement?.code ?? "");
    const indexB = ACHIEVEMENT_ORDER.indexOf(b.achievement?.code ?? "");
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

/** Количество «выполненных заданий» — сумма всех полученных уровней (каждый уровень = одно выполнение порога) */
export function countCompletedTasks(
  list: (UserAchievement & { achievement?: unknown })[]
): number {
  return list.reduce((sum, ua) => sum + (ua.level ?? 0), 0);
}
