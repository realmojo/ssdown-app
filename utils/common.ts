export const getVideoType = (url: string) => {
  if (url.includes("x.com") || url.includes("twitter.com")) {
    return "x";
  } else if (url.includes("tiktok")) {
    return "tiktok";
  } else if (url.includes("youtu.be") || url.includes("youtube.com")) {
    return "youtube";
  } else if (url.includes("instagram")) {
    return "instagram";
  } else if (url.includes("facebook")) {
    return "facebook";
  } else {
    return "unknown";
  }
};
