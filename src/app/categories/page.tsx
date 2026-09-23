import { getCategories } from "@/lib/data";
import CategoryManager from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">
            Categories
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reusable sell-ladder templates. Apply one to a token from its page to copy these
            rungs onto it — editing a category here doesn&apos;t change tokens that already
            applied it.
          </p>
        </div>
      </header>

      <CategoryManager categories={categories} />
    </div>
  );
}
