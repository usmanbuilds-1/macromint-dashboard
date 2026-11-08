// Allowlisted schema.org recipe import. Disabled until outbound network
// restrictions are approved. This endpoint never fetches an arbitrary host.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json,errorResponse,preflight,readJsonObject } from "../_shared/http.ts";
import { allowedRecipeUrl,extractRecipeFromHtml } from "./schema-recipe.ts";

const MAX_HTML_BYTES=600_000;
async function readSmallHtml(response:Response):Promise<string|null> {
  const length=Number(response.headers.get("content-length")??"0");
  if(length>MAX_HTML_BYTES)return null;
  if(!response.body)return null;
  const reader=response.body.getReader();
  const decoder=new TextDecoder("utf-8",{fatal:true});
  let size=0,text="";
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      size+=chunk.value.byteLength;
      if(size>MAX_HTML_BYTES){await reader.cancel("Recipe page too large");return null;}
      text+=decoder.decode(chunk.value,{stream:true});
    }
    return text+decoder.decode();
  } catch{return null;}
  finally{reader.releaseLock();}
}
Deno.serve(async(req)=>{
  const pre=preflight(req);if(pre)return pre;
  if(req.method!=="POST")return errorResponse("METHOD","POST only",405);
  if(Deno.env.get("RECIPE_IMPORT_ENABLED")!=="true" ||
    Deno.env.get("RECIPE_IMPORT_EGRESS_APPROVED")!=="true")
    return errorResponse("UNAVAILABLE","Recipe URL import is not enabled on this server.",503);
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer /i,"");
  if(!token)return errorResponse("AUTH","Sign in required",401);
  const input=await readJsonObject(req,1024);
  const canonical=allowedRecipeUrl(input?.url as string);
  if(!canonical)return errorResponse("UNSUPPORTED_URL",
    "Only approved recipe sites are supported. Paste ingredient text instead.",400);
  const origin=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!origin||!anon||!service)return errorResponse("CONFIG","Import service unavailable",503);
  const publicClient=createClient(origin,anon,{global:{headers:{Authorization:"Bearer "+token}}});
  const {data:auth,error:authError}=await publicClient.auth.getUser();
  if(authError||!auth.user)return errorResponse("AUTH","Invalid session",401);
  const {data:access,error:accessError}=await publicClient.rpc("check_access");
  if(accessError||access!==true)return errorResponse("NO_ACCESS","Active access required",403);
  const server=createClient(origin,service,{auth:{persistSession:false}});
  const {data:allowed,error:budgetError}=await server.rpc("consume_recipe_import_budget",{p_user:auth.user.id});
  if(budgetError)return errorResponse("CONFIG","Import quota is unavailable",503);
  if(allowed!==true)return errorResponse("RATE_LIMIT","Recipe import limit reached. Try again later.",429);
  try{
    const response=await fetch(canonical,{
      method:"GET",redirect:"manual",signal:AbortSignal.timeout(8000),
      credentials:"omit",referrerPolicy:"no-referrer",
      headers:{"Accept":"text/html","User-Agent":"MacroMintRecipeImport/1.0"},
    });
    if(!response.ok||response.status>=300)return errorResponse("UNAVAILABLE",
      "This recipe site didn't provide a readable page.",422);
    const contentType=response.headers.get("content-type")??"";
    if(!/^text\/html\b/i.test(contentType))return errorResponse("UNAVAILABLE","Recipe page is not HTML.",422);
    const html=await readSmallHtml(response);
    if(!html)return errorResponse("TOO_LARGE","Recipe page is too large or unreadable.",422);
    const parsed=extractRecipeFromHtml(html);
    if(!parsed)return errorResponse("NO_RECIPE",
      "No structured ingredient list was found. Paste the ingredients manually.",422);
    return json({...parsed,source:canonical,
      note:"Imported text only. Search and confirm every ingredient and amount before saving."});
  }catch{
    return errorResponse("UNAVAILABLE",
      "The recipe site couldn't be reached. Paste ingredients manually.",503);
  }
});
