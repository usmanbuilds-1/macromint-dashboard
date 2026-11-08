/** Guarded schema.org recipe extraction. Pure, bounded and HTML non-executing. */
export interface ImportableRecipe {
  name:string; servings:number|null; ingredients:string[];
}
const HOSTS=new Set(["www.bbcgoodfood.com","www.allrecipes.com","www.seriouseats.com"]);
export function allowedRecipeUrl(input:string):string|null {
  if(typeof input!=="string"||input.length>500||input.includes("\\")||/[\x00-\x1f]/.test(input)) return null;
  try {
    const raw=new URL(input);
    if(raw.protocol!=="https:"||!HOSTS.has(raw.hostname)||raw.username||raw.password||
       (raw.port!==""&&raw.port!=="443")||raw.pathname.length>300) return null;
    const path=decodeURIComponent(raw.pathname);
    if(!/^\/[a-zA-Z0-9/_%.\-]*$/.test(path)||path.includes("..")||path.includes("//"))return null;
    // Deliberately discard query params, fragments and all user-supplied headers.
    return "https://"+raw.hostname+raw.pathname;
  } catch {return null;}
}
function recipeNode(value:unknown,depth=0):Record<string,unknown>|null {
  if(depth>6||!value||typeof value!=="object") return null;
  if(Array.isArray(value)){
    for(const entry of value.slice(0,40)){const found=recipeNode(entry,depth+1);if(found)return found;}
    return null;
  }
  const obj=value as Record<string,unknown>;
  const types=Array.isArray(obj["@type"])?obj["@type"]:[obj["@type"]];
  if(types.some((t)=>typeof t==="string"&&/(^|\/)Recipe$/.test(t)))return obj;
  const nodes=obj["@graph"];
  if(nodes){const found=recipeNode(nodes,depth+1);if(found)return found;}
  for(const key of ["mainEntity","itemListElement"]){
    if(obj[key]){const found=recipeNode(obj[key],depth+1);if(found)return found;}
  }
  return null;
}
export function extractRecipeFromHtml(html:string):ImportableRecipe|null {
  if(typeof html!=="string"||html.length>600_000)return null;
  const scripts=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match:RegExpExecArray|null,count=0;
  while((match=scripts.exec(html))&&count++<70){
    if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1]??""))continue;
    const body=(match[2]??"").trim();
    if(body.length>100_000)continue;
    let json:unknown;
    try{json=JSON.parse(body);}catch{continue;}
    const recipe=recipeNode(json);
    if(!recipe)continue;
    const name=typeof recipe["name"]==="string"?recipe["name"].trim().slice(0,100):"";
    const list=recipe["recipeIngredient"];
    const ingredients=Array.isArray(list)
      ?list.filter((v):v is string=>typeof v==="string").slice(0,30)
        .map((s)=>s.trim().slice(0,200)).filter(Boolean):[];
    if(!name||!ingredients.length)return null;
    const yieldRaw=recipe["recipeYield"];
    const yieldText=typeof yieldRaw==="number"||typeof yieldRaw==="string"
      ?String(yieldRaw):Array.isArray(yieldRaw)?String(yieldRaw[0]??""):"";
    const number=yieldText.match(/^\s*(\d{1,2})(?:\s|$)/);
    const servings=number?Number(number[1]):null;
    return {name,ingredients,servings:servings&&servings<=50?servings:null};
  }
  return null;
}
