import { backend } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { GroceryList } from "./GroceryList";

export function SavedMealShopping({active}: {active:boolean}) {
  const saved=useAsyncData(()=>backend.getSavedMeals(),[],"saved-meals",active);
  if (!active || !saved.data?.length) return null;
  return <GroceryList meals={saved.data}/>;
}
