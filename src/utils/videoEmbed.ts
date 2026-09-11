import { VideoItem, VideoProvider } from "../services/types";

export function getVimeoEmbedUrl(video: VideoItem): string {
  const params = new URLSearchParams({
    badge: "0",
    title: "0",
    byline: "0",
    portrait: "0",
    vimeo_logo: "0",
  });
  if (video.meta?.hash) params.set("h", String(video.meta.hash));
  return `https://player.vimeo.com/video/${video.video_id}?${params.toString()}`;
}

export function getBunnyEmbedUrl(video: VideoItem): string {
  const libraryId = video.meta?.library_id;
  const params = new URLSearchParams({
    autoplay: "false",
    loop: "false",
    muted: "false",
    preload: "true",
    responsive: "true",
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${video.video_id}?${params.toString()}`;
}

export function getVideoEmbedUrl(video: VideoItem): string {
  if (video.provider === "vimeo") return getVimeoEmbedUrl(video);
  if (video.provider === "bunny") return getBunnyEmbedUrl(video);
  return "";
}

/** Devuelve los videos activos ordenados por prioridad ascendente */
export function getActiveSortedVideos(videos?: VideoItem[]): VideoItem[] {
  if (!videos?.length) return [];
  return [...videos]
    .filter((v) => v.status === "active")
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

export function providerLabel(provider: VideoProvider | string): string {
  if (provider === "vimeo") return "Vimeo";
  if (provider === "bunny") return "Bunny";
  return provider;
}
