const OPEN_CHAT_EVENT = 'campus-customs-open-chat'

export function openShopChat(): void {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT))
}

export function onOpenShopChat(listener: () => void): () => void {
  window.addEventListener(OPEN_CHAT_EVENT, listener)
  return () => window.removeEventListener(OPEN_CHAT_EVENT, listener)
}
