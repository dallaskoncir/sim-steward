"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col p-4">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Sim Steward</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
          <ScrollArea className="flex-1 rounded-md border p-4">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Describe an on-track incident to get a ruling.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
                  <span className="text-muted-foreground text-xs font-medium uppercase">
                    {message.role === "user" ? "You" : "Steward"}
                  </span>
                  <div className="whitespace-pre-wrap">
                    {message.parts.map((part, index) =>
                      part.type === "text" ? <span key={index}>{part.text}</span> : null,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!input.trim()) return;
              sendMessage({ text: input });
              setInput("");
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={status !== "ready"}
              placeholder="e.g. divebomb into turn 1 that put another car in the wall"
            />
            <Button type="submit" disabled={status !== "ready"}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
