import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { AppearanceBody } from "@/components/admin/AppearanceBody";

export default async function Appearance() {
  await requireStaff("appearance.manage");
  return (
    <div>
      <PageHeader title="Appearance" sub="Theme, main colour, fonts and the 3D splash screen. Also under Settings → Theme & fonts." />
      <WebsiteTabs active="appearance" />
      <AppearanceBody />
    </div>
  );
}
