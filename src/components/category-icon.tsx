import {
  Construction,
  Waves,
  Droplets,
  Trash2,
  Lightbulb,
  Trees,
  Car,
  Ellipsis,
} from "lucide-react";
import type { Category } from "@/lib/issues";
const icons = {
  roads: Construction,
  sewage: Waves,
  water: Droplets,
  waste: Trash2,
  lighting: Lightbulb,
  parks: Trees,
  traffic: Car,
  other: Ellipsis,
};
export default function CategoryIcon({
  category,
  size = 18,
}: {
  category: Category;
  size?: number;
}) {
  const Icon = icons[category];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
