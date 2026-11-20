import { getSettings } from "@/lib/settings";
import { getMenu } from "@/lib/storefront";
import { HeaderBar, HeaderShell } from "./Chrome";

export { LogoMark } from "./BrandLogo";

export async function Header() {
  const [s, menu] = await Promise.all([getSettings(), getMenu()]);
  return (
    <HeaderShell>
      <HeaderBar menu={menu} name={s.business.name} tagline={s.business.tagline} />
    </HeaderShell>
  );
}
