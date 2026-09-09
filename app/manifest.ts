import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgentDesk",
    short_name: "AgentDesk",
    description: "Discover source-backed BNB Chain agents, audition them on your exact task, compare live evidence, and hire the best fit on-chain.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    categories: ["finance", "productivity", "utilities"],
  };
}
