export interface SocialPlatform {
  id: string;
  name: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "email", name: "Email", placeholder: "mailto:you@example.com" },
  { id: "newsletter", name: "Newsletter", placeholder: "https://newsletter.example.com" },
  { id: "phone", name: "Phone", placeholder: "tel:+1234567890" },
  { id: "website", name: "Website", placeholder: "https://yourwebsite.com" },
  { id: "amazon", name: "Amazon", placeholder: "https://amazon.com/shop/..." },
  { id: "applemusic", name: "Apple Music", placeholder: "https://music.apple.com/..." },
  { id: "applepodcasts", name: "Apple Podc...", placeholder: "https://podcasts.apple.com/..." },
  { id: "artstation", name: "Artstation", placeholder: "https://artstation.com/..." },
  { id: "bandcamp", name: "Bandcamp", placeholder: "https://bandcamp.com/..." },
  { id: "behance", name: "Behance", placeholder: "https://behance.net/..." },
  { id: "bluesky", name: "Bluesky", placeholder: "https://bsky.app/profile/..." },
  { id: "caffeine", name: "Caffeine", placeholder: "https://caffeine.tv/..." },
  { id: "clubhouse", name: "Clubhouse", placeholder: "https://clubhouse.com/..." },
  { id: "discord", name: "Discord", placeholder: "https://discord.gg/..." },
  { id: "dribbble", name: "Dribble", placeholder: "https://dribbble.com/..." },
  { id: "duolingo", name: "Duolingo", placeholder: "https://duolingo.com/profile/..." },
  { id: "facebook", name: "Facebook", placeholder: "https://facebook.com/..." },
  { id: "github", name: "Github", placeholder: "https://github.com/..." },
  { id: "goodreads", name: "Goodreads", placeholder: "https://goodreads.com/..." },
  { id: "googlepodcasts", name: "Google Pod...", placeholder: "https://podcasts.google.com/..." },
  { id: "instagram", name: "Instagram", placeholder: "https://instagram.com/..." },
  { id: "kofi", name: "Ko-fi", placeholder: "https://ko-fi.com/..." },
  { id: "lastfm", name: "Last.fm", placeholder: "https://last.fm/user/..." },
  { id: "linkedin", name: "Linkedin", placeholder: "https://linkedin.com/in/..." },
  { id: "medium", name: "Medium", placeholder: "https://medium.com/@..." },
  { id: "meetup", name: "Meetup", placeholder: "https://meetup.com/..." },
  { id: "onlyfans", name: "OnlyFans", placeholder: "https://onlyfans.com/..." },
  { id: "patreon", name: "Patreon", placeholder: "https://patreon.com/..." },
  { id: "pinterest", name: "Pinterest", placeholder: "https://pinterest.com/..." },
  { id: "reddit", name: "Reddit", placeholder: "https://reddit.com/u/..." },
  { id: "rednote", name: "RedNote", placeholder: "https://xiaohongshu.com/..." },
  { id: "signal", name: "Signal", placeholder: "https://signal.me/..." },
  { id: "slack", name: "Slack", placeholder: "https://slack.com/..." },
  { id: "snapchat", name: "Snapchat", placeholder: "https://snapchat.com/add/..." },
  { id: "soundcloud", name: "Soundcloud", placeholder: "https://soundcloud.com/..." },
  { id: "spotify", name: "Spotify", placeholder: "https://open.spotify.com/..." },
  { id: "steam", name: "Steam", placeholder: "https://steamcommunity.com/..." },
  { id: "strava", name: "Strava", placeholder: "https://strava.com/athletes/..." },
  { id: "telegram", name: "Telegram", placeholder: "https://t.me/..." },
  { id: "threads", name: "Threads", placeholder: "https://threads.net/@..." },
  { id: "tidal", name: "Tidal", placeholder: "https://tidal.com/..." },
  { id: "tiktok", name: "TikTok", placeholder: "https://tiktok.com/@..." },
  { id: "tumblr", name: "Tumblr", placeholder: "https://tumblr.com/..." },
  { id: "twitch", name: "Twitch", placeholder: "https://twitch.tv/..." },
  { id: "x", name: "X (Twitter)", placeholder: "https://x.com/..." },
  { id: "unsplash", name: "Unsplash", placeholder: "https://unsplash.com/@..." },
  { id: "vimeo", name: "Vimeo", placeholder: "https://vimeo.com/..." },
  { id: "wechat", name: "WeChat", placeholder: "https://wechat.com/..." },
  { id: "whatsapp", name: "WhatsApp", placeholder: "https://wa.me/..." },
  { id: "youtube", name: "Youtube", placeholder: "https://youtube.com/..." },
  { id: "youtubemusic", name: "Youtube Mu...", placeholder: "https://music.youtube.com/..." },
  { id: "youtubeshorts", name: "Youtube Sh...", placeholder: "https://youtube.com/shorts/..." },
];

export function getPlatform(id: string): SocialPlatform | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === id);
}
