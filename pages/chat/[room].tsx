import { useRouter } from "next/router";
import ChatClient from "../../src/ChatClient";

export default function ChatPage() {
  const router = useRouter();
  const { room, friend } = router.query; // friend is now correctly extracted

  if (!room || !friend) return <div style={{padding: 20}}>Loading...</div>;

  return (
    <div className="chat-page">
      <div className="header">{friend as string}</div> {/* Display friend's address/name */}
      <ChatClient roomId={room as string} friendAddress={friend as string} />
      <style jsx>{`
        .chat-page { display: flex; flex-direction: column; height: 100vh; max-width: 600px; margin: auto; border: 1px solid #000000ff; }
        .header { padding: 12px; border-bottom: 1px solid #ccc; font-weight: bold; background: #f0f0f0; }
      `}</style>
    </div>
  );
}