type TelegramConfig = {
  botToken?: string;
  chatId?: string;
};

export async function sendTelegramNotification(
  config: TelegramConfig,
  text: string,
): Promise<void> {
  const token = config.botToken?.trim();
  const chatId = config.chatId?.trim();
  if (!token || !chatId) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      console.error("Telegram notification failed with status", response.status);
    }
  } catch (error) {
    console.error("Telegram notification could not be sent", error);
  }
}
