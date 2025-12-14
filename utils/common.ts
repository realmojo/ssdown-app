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
  } else if (url.includes("9gag")) {
    return "9gag";
  } else if (url.includes("dailymotion")) {
    return "dailymotion";
  } else {
    return "unknown";
  }
};
