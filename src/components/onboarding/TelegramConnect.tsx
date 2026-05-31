import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Loader2, Send, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BOT_USERNAME = "MarkVision_Finance_bot";

type Props = {
  /** Куда отправить после успешного подключения. По умолчанию — никуда (просто обновит данные). */
  redirectTo?: string;
  /** Показать компактный вариант (для настроек). */
  compact?: boolean;
  /** Колбэк после успеха. */
  onConnected?: () => void;
};

export function TelegramConnect({ redirectTo, compact, onConnected }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: tg } = useQuery({
    queryKey: ["telegram_users", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isConnected = !!tg?.telegram_chat_id;

  // Always-on realtime subscription on telegram_users for current user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`tg-link-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "telegram_users",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.telegram_chat_id) {
            setWaiting(false);
            qc.invalidateQueries({ queryKey: ["telegram_users"] });
            toast.success("✅ Telegram подключён!");
            onConnected?.();
            if (typeof window !== "undefined" && window.location.pathname === "/welcome") {
              try { localStorage.removeItem("mv_pending_onboarding"); } catch {}
              navigate({ to: "/" as any, replace: true });
            } else if (redirectTo) {
              navigate({ to: redirectTo as any, replace: true });
            }
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, qc, navigate, redirectTo, onConnected]);

  const tgLink = linkCode
    ? `https://t.me/${BOT_USERNAME}?start=${linkCode}`
    : `https://t.me/${BOT_USERNAME}`;

  async function startConnect() {
    if (!user) return;
    // Open popup SYNCHRONOUSLY to preserve user-gesture and avoid popup blockers
    const win = window.open("about:blank", "_blank");
    setBusy(true);
    try {
      const { data: code, error } = await supabase.rpc("get_or_create_link_code");
      if (error || !code) {
        win?.close();
        throw error ?? new Error("Не удалось получить код подключения");
      }
      const finalCode = String(code).trim();
      setLinkCode(finalCode);
      setWaiting(true);

      const url = `https://t.me/${BOT_USERNAME}?start=${finalCode}`;
      if (win && !win.closed) {
        win.location.href = url;
      } else {
        toast.message("Открой Telegram вручную", {
          description: "Браузер заблокировал всплывающее окно. Используй ссылку ниже.",
        });
      }
    } catch (e: any) {
      win?.close();
      toast.error(e.message ?? "Не удалось создать код привязки");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(tgLink);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  if (isConnected) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4", compact && "p-3")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/20 text-success">
          <Check size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Telegram подключён</div>
          {tg?.username && (
            <div className="truncate text-xs text-muted-foreground">@{tg.username}</div>
          )}
        </div>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Открыть <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={startConnect}
        disabled={busy}
        size={compact ? "default" : "lg"}
        className={cn(
          "gap-2 bg-[#229ED9] text-white hover:bg-[#1d8fc6]",
          !compact && "w-full h-12 text-base",
        )}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Подключить Telegram
      </Button>

      {waiting && linkCode && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            Ожидаем подключения… открой бота и нажми <b className="text-foreground">Start</b>.
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-background px-2 py-1.5 text-[11px] font-mono">
              {tgLink}
            </code>
            <Button size="icon" variant="ghost" onClick={copyLink} aria-label="Скопировать ссылку">
              <Copy size={14} />
            </Button>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Код: <code className="font-mono">{linkCode}</code> · действителен 30 дней
          </div>
        </div>
      )}
    </div>
  );
}

export { BOT_USERNAME };