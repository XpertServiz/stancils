import { getSettings } from "@/lib/settings";
import { FONTS, THEMES, themeById } from "@/lib/themes";
import { AppearanceForm } from "./AppearanceForm";

export async function AppearanceBody() {
  const s = await getSettings();
  return (
    <AppearanceForm
      themes={THEMES}
      fonts={Object.entries(FONTS).map(([name, f]) => ({ name, ...f }))}
      current={{ preset: themeById(s.theme.preset).id, accent: s.theme.accent, displayFont: s.theme.displayFont, bodyFont: s.theme.bodyFont, splash: s.splash.enabled, splashStyle: s.splash.style ?? "cube" }}
    />
  );
}
