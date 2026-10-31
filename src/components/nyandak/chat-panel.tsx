"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, jam, useSocket } from "./client";
import type { Me, MessageDTO } from "./types";

export default function ChatPanel({
  orderId,
  me,
  chatOpen,
  closedNote,
}: {
  orderId: string;
  me: Me;
  chatOpen: boolean;
  closedNote: string;
}) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(chatOpen);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useSocket(me.id, me.role, orderId);

  const load = async () => {
    try {
      const r = await api<{ messages: MessageDTO[]; chatOpen: boolean }>(`/api/chat?orderId=${orderId}`);
      setMessages(r.messages);
      setOpen(r.chatOpen);
    } catch {}
  };

  useEffect(() => {
    load();
     
  }, [orderId]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (p: { orderId: string; message: MessageDTO }) => {
      if (p.orderId !== orderId) return;
      setMessages((prev) => (prev.some((m) => m.id === p.message.id) ? prev : [...prev, p.message]));
    };
    const onOrder = () => load();
    socket.on("chat:new", onNew);
    socket.on("order:update", onOrder);
    return () => {
      socket.off("chat:new", onNew);
      socket.off("order:update", onOrder);
    };
     
  }, [socket, orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const r = await api<{ message: MessageDTO }>("/api/chat", { orderId, text: t });
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
    } catch (err) {
      toast.error((err as Error).message);
      setText(t);
    }
  }

  return (
    <div className="flex flex-col rounded-[20px] bg-card border border-border/60 overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/60 border-b border-border/60">
        <p className="text-sm font-bold">💬 Chat order</p>
        <p className="text-[11px] text-muted-foreground">
          {open ? "Hidup dari order diambil sampai selesai" : closedNote}
        </p>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            Belum ada pesan. Sapa kurirnya / customernya 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                }`}
              >
                {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{m.sender.name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`text-[9px] mt-0.5 text-right ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {jam(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {open ? (
        <div className="flex gap-2 p-2.5 border-t border-border/60">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tulis pesan…"
            maxLength={1000}
          />
          <Button onClick={send} size="icon" className="h-10 w-10 rounded-full shrink-0" aria-label="Kirim pesan">
            ➤
          </Button>
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground py-2 border-t border-border/60">{closedNote}</p>
      )}
    </div>
  );
}
