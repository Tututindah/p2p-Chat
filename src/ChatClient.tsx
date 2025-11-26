// ChatClient.tsx
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@meshsdk/react";
import { addToLedger, getLedger, createPeer, setupReceiver } from "./p2p";
import ChatBubble from "./ui/ChatBubble";

interface Props {
  roomId: string;
  friendAddress: string;
}

export default function ChatClient({ roomId, friendAddress }: Props) {
  const { wallet, connected } = useWallet();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const [myAddress, setMyAddress] = useState("");

  const ws = useRef<WebSocket | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const iceQueue = useRef<RTCIceCandidate[]>([]);

  // -------------------------------
  // Offline queue persistence
  // -------------------------------
  const getOfflineQueue = () => {
    const q = localStorage.getItem(`offline-${roomId}`);
    return q ? JSON.parse(q) : [];
  };

  const setOfflineQueue = (q: any[]) => {
    localStorage.setItem(`offline-${roomId}`, JSON.stringify(q));
  };

  const sendPendingMessages = () => {
    if (channel.current?.readyState === "open") {
      const queue = getOfflineQueue();
      queue.forEach(msg => channel.current?.send(JSON.stringify(msg)));
      setOfflineQueue([]);
    }
  };

  // -------------------------------
  // Load messages from localStorage
  // -------------------------------
  useEffect(() => {
    setMessages(getLedger(roomId));
  }, [roomId]);

  const handleIncomingMsg = (msg: any) => {
    addToLedger(msg, roomId);
    setMessages(getLedger(roomId));
  };

  const sendSignal = (type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, roomId, ...payload }));
    }
  };

  const setupIceHandling = (p: RTCPeerConnection) => {
    p.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", { candidate: e.candidate });
    };
  };

  const handleIce = async (candidate: RTCIceCandidate) => {
    if (peer.current?.remoteDescription) {
      try { await peer.current.addIceCandidate(candidate); } catch (e) { console.warn("ICE Error", e); }
    } else {
      iceQueue.current.push(candidate);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    setStatus("Receiving call...");
    const p = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peer.current = p;
    setupReceiver(p, handleIncomingMsg);
    setupIceHandling(p);

    p.ondatachannel = (e) => {
      channel.current = e.channel;
      channel.current.onopen = () => {
        setStatus("Online (P2P Encrypted)");
        sendPendingMessages();
      };
      channel.current.onmessage = (ev) => handleIncomingMsg(JSON.parse(ev.data));
    };

    await p.setRemoteDescription(offer);
    while (iceQueue.current.length > 0) {
      const c = iceQueue.current.shift();
      if (c) await p.addIceCandidate(c);
    }

    const answer = await p.createAnswer();
    await p.setLocalDescription(answer);
    sendSignal("answer", { answer });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peer.current) await peer.current.setRemoteDescription(answer);
  };

  const initiateCall = async () => {
    setStatus("Calling...");
    const { peer: p, channel: ch } = createPeer(handleIncomingMsg);
    peer.current = p;
    channel.current = ch;
    setupIceHandling(p);

    ch.onopen = () => {
      setStatus("Online (P2P Encrypted)");
      sendPendingMessages();
    };

    const offer = await p.createOffer();
    await p.setLocalDescription(offer);
    sendSignal("offer", { offer });
  };

  // -------------------------------
  // Mesh SDK wallet helpers
  // -------------------------------
  const getAddressWithRetry = async (retries = 3): Promise<string | null> => {
    try {
      let addr = await wallet.getChangeAddress();
      if (!addr) return null;
      return Array.isArray(addr) ? addr[0] : addr;
    } catch (err: any) {
      if (retries > 0 && err.message?.includes("account changed")) {
        await new Promise(res => setTimeout(res, 1000));
        return getAddressWithRetry(retries - 1);
      }
      throw err;
    }
  };

  const getAuth = async () => {
    const stored = localStorage.getItem("auth");
    if (stored) return JSON.parse(stored);

    const addr = await getAddressWithRetry();
    if (!addr) return null;

    const signature = await wallet.signData(roomId, addr, true);
    const auth = { address: addr, signature };
    localStorage.setItem("auth", JSON.stringify(auth));
    return auth;
  };

  // -------------------------------
  // WebSocket & session
  // -------------------------------
  useEffect(() => {
    if (!connected) {
      setStatus("Please connect wallet");
      return;
    }

    let isMounted = true;

    const startSession = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const addr = await getAddressWithRetry();
        if (!addr || !isMounted) return;
        setMyAddress(addr);

        ws.current?.close();
        peer.current?.close();

        const socket = new WebSocket("wss://6k0m51t3-9000.asse.devtunnels.ms");
        ws.current = socket;

        socket.onopen = async () => {
          setStatus("Authenticating...");
          try {
            const auth = await getAuth();
            if (!auth) return;
            socket.send(JSON.stringify({ type: "auth", roomId, address: auth.address, signature: auth.signature }));
          } catch (err) {
            console.error("Auth failed:", err);
            setStatus("Authentication Failed. Check Wallet.");
          }
        };

        socket.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "auth-success") setStatus("Connected. Waiting for friend...");
          if (msg.type === "peer-status" && msg.status === "online") {
            setStatus("Friend Online");
            sendPendingMessages();
            if (myAddress < friendAddress.toLowerCase()) initiateCall();
          }
          if (msg.type === "offer") handleOffer(msg.offer);
          if (msg.type === "answer") handleAnswer(msg.answer);
          if (msg.type === "ice") handleIce(msg.candidate);
        };

      } catch (err) {
        console.error("Wallet error", err);
        setStatus("Wallet Error");
      }
    };

    startSession();

    return () => {
      isMounted = false;
      ws.current?.close();
      peer.current?.close();
    };
  }, [roomId, connected, friendAddress, myAddress]);

  // -------------------------------
  // Send message
  // -------------------------------
  const sendMessage = () => {
    if (!input.trim()) return;

    const msg = {
      id: crypto.randomUUID(),
      sender: myAddress,
      text: input,
      timestamp: Date.now(),
      status: "sent"
    };

    addToLedger(msg, roomId);
    setMessages(getLedger(roomId));

    if (channel.current?.readyState === "open") {
      channel.current.send(JSON.stringify({ ...msg, type: "message" }));
    } else {
      const queue = getOfflineQueue();
      queue.push({ ...msg, type: "message" });
      setOfflineQueue(queue);
    }

    setInput("");
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="status-dot" style={{ background: status.includes("Online") ? "#25d366" : "orange" }}></div>
        <span>{friendAddress.slice(0, 8)}...</span>
        <small style={{ fontSize: 10, opacity: 0.7 }}>{status}</small>
      </div>
      <div className="messages-area">
        {messages.map((m) => (
          <ChatBubble key={m.id} message={{ ...m, sender: m.sender === myAddress ? 'me' : 'them' }} />
        ))}
      </div>
      <div className="input-bar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={!status.includes("Online")}>Send</button>
      </div>
      <style jsx>{`
        .chat-interface { display: flex; flex-direction: column; height: 100vh; background: #e5ddd5; }
        .chat-header { background: #075e54; color: white; padding: 10px 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .messages-area { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
        .input-bar { padding: 10px; background: #f0f0f0; display: flex; gap: 10px; }
        input { flex: 1; padding: 10px; border-radius: 20px; border: none; outline: none; }
        button { background: #075e54; color: white; border: none; padding: 0 20px; border-radius: 20px; cursor: pointer; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .input-bar input {
    color: black;
    border: none;
    outline: none;
    padding: 10px 12px;
    border-radius: 20px;
    flex: 1;
  }
      `}</style>
    </div>
  );
}
