interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TelegramWebApp {
  readonly initData: string;
  openTelegramLink(url: string): void;
}

interface Window {
  readonly Telegram?: {
    readonly WebApp?: TelegramWebApp;
  };
}
