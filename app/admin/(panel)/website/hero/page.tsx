import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveSiteSettings } from "@/app/admin/actions/website";

export default async function Hero() {
  await requireStaff("content.edit");
  const s = await getSettings();
  const h = s.hero;
  return (
    <div>
      <PageHeader title="Hero & site" />
      <WebsiteTabs active="hero" />
      <ActionForm action={saveSiteSettings} className="grid gap-6 xl:grid-cols-2">
        <Panel title="Hero">
          <div className="space-y-3">
            <Field label="Media"><select name="mode" defaultValue={h.mode} className="select"><option value="3d">3D stencil (Light Through the Stencil)</option><option value="video">Full video</option><option value="image">Image</option></select></Field>
            <Field label="Featured product slug for the 3D hero" hint="Leave blank to use the first layered design."><input name="featuredSlug" defaultValue={h.featuredSlug} className="input" /></Field>
            <Field label="Video URL (MP4, muted autoplay)"><input name="videoUrl" defaultValue={h.videoUrl} className="input" /></Field>
            <Field label="Image URL"><input name="imageUrl" defaultValue={h.imageUrl} className="input" /></Field>
            <Field label="Eyebrow"><input name="eyebrow" defaultValue={h.eyebrow} maxLength={60} className="input" /></Field>
            <Field label="Headline"><input name="headline" defaultValue={h.headline} maxLength={70} className="input" /></Field>
            <Field label="Sub-text"><textarea name="sub" defaultValue={h.sub} maxLength={280} rows={3} className="textarea" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Primary button"><input name="p_label" defaultValue={h.primaryCta.label} className="input" /></Field>
              <Field label="Link"><input name="p_href" defaultValue={h.primaryCta.href} className="input" /></Field>
              <Field label="Secondary button"><input name="s_label" defaultValue={h.secondaryCta.label} className="input" /></Field>
              <Field label="Link"><input name="s_href" defaultValue={h.secondaryCta.href} className="input" /></Field>
            </div>
            <Field label="Trust points (one per line — real claims only)"><textarea name="trust" defaultValue={h.trust.join("\n")} rows={3} className="textarea" /></Field>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Announcement bar">
            <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" name="ann_enabled" defaultChecked={s.announcement.enabled} />Show announcement bar</label>
            <Field label="Text" hint="{threshold} becomes the visitor's free-shipping threshold in their currency."><input name="ann_text" defaultValue={s.announcement.text} className="input" /></Field>
          </Panel>
          <Panel title="Splash screen">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="splash" defaultChecked={s.splash.enabled} />Show the 1.6s laser-cut splash on first visit (skipped for reduced motion and bots)</label>
          </Panel>
          <Panel title="Default SEO">
            <Field label="Site title"><input name="seo_title" defaultValue={s.seo.title} maxLength={70} className="input" /></Field>
            <Field label="Meta description" className="mt-3"><textarea name="seo_desc" defaultValue={s.seo.description} maxLength={180} rows={3} className="textarea" /></Field>
          </Panel>
          <button className="btn btn-primary">Publish</button>
        </div>
      </ActionForm>
    </div>
  );
}
