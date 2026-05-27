import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resolveUserId(chatId: number): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("get_user_by_chat_id", { p_chat_id: chatId });
  if (error || !data) throw new Response("Chat not linked", { status: 404 });
  return data as string;
}