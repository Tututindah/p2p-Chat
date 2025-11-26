export default function ChatBubble({ message }: { message: any }) {
  const isMe = message.sender === "me";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          background: isMe ? "#dcf8c6" : "#ffffff", 
          color: "#000000", 
          padding: "8px 12px",
          borderRadius: "8px",
          maxWidth: "70%",
          wordWrap: "break-word",
          boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
        }}
      >
        {message.text}
        <div
          style={{
            fontSize: "10px",
            color: "#555",
            textAlign: "right",
            marginTop: "4px",
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
