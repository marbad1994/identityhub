export type WidgetSelection = {
  mode: "sandbox";
  authenticated: false;
  platforms: string[];
  appName: string;
};

export type WidgetMountOptions = {
  appName?: string;
  theme?: "light" | "dark";
  providers?: string[];
  mode?: "sandbox" | "live";
  clientId?: string;
  hubOrigin?: string;
  redirectUri?: string;
  onComplete?: (detail: WidgetSelection) => void;
};

declare global {
  interface Window {
    IdentityHub?: {
      mount: (target: string | HTMLElement, options?: WidgetMountOptions) => { destroy: () => void };
    };
  }
}

export {};
