"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  LayerCategoryPanel,
  type LayerCategory,
} from "@/components/LayerCategoryPanel";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { LAYER_ITEM_PREF_KEYS, patchFromCategoryItems } from "@/lib/layerItemPrefKeys";

function extractChecked(categories: LayerCategory[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const category of categories) {
    for (const item of category.items) {
      map[item.id] = item.checked;
    }
  }
  return map;
}

type LayerCategoryDraftHostProps = {
  categories: LayerCategory[];
  batchStatus?: string | null;
  autoExpandCategoryId?: string;
  autoExpandWhen?: boolean;
  expandActiveCategories?: boolean;
  onPatch: (patch: Partial<LayerPrefs>) => void;
};

export const LayerCategoryDraftHost = memo(function LayerCategoryDraftHost({
  categories,
  batchStatus,
  autoExpandCategoryId,
  autoExpandWhen,
  expandActiveCategories,
  onPatch,
}: LayerCategoryDraftHostProps) {
  const [checked, setChecked] = useState(() => extractChecked(categories));

  const applyItem = useCallback(
    (itemId: string, value: boolean) => {
      setChecked((prev) => ({ ...prev, [itemId]: value }));
      const key = LAYER_ITEM_PREF_KEYS[itemId];
      if (key) {
        onPatch({ [key]: value } as Partial<LayerPrefs>);
      }
    },
    [onPatch],
  );

  const wrappedCategories = useMemo<LayerCategory[]>(() => {
    return categories.map((category) => ({
      ...category,
      onToggleAll: category.onToggleAll
        ? (enabled: boolean) => {
            const patch = patchFromCategoryItems(category.items, enabled);
            setChecked((prev) => {
              const next = { ...prev };
              for (const item of category.items) {
                next[item.id] = enabled;
              }
              return next;
            });
            onPatch(patch);
          }
        : undefined,
      items: category.items.map((item) => ({
        ...item,
        checked: checked[item.id] ?? item.checked,
        onChange: (value: boolean) => applyItem(item.id, value),
      })),
    }));
  }, [applyItem, categories, checked, onPatch]);

  return (
    <LayerCategoryPanel
      categories={wrappedCategories}
      batchStatus={batchStatus}
      autoExpandCategoryId={autoExpandCategoryId}
      autoExpandWhen={autoExpandWhen}
      expandActiveCategories={expandActiveCategories}
    />
  );
});
