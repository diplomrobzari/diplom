import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "НаСтарте.ru",
    short_name: "НаСтарте",
    description: "Платформа объявлений о соревнованиях и турнирах.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7D39EB",
    lang: "ru",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
