import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "ledger_messages";

export function getLedger(room: string) {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(`${STORAGE_KEY}_${room}`);
  return data ? JSON.parse(data) : [];
}

export function addToLedger(entry: any, room: string) {
  if (typeof window === "undefined") return;
  const ledger = getLedger(room);
  
  if (!ledger.find((m: any) => m.id === entry.id)) {
      ledger.push(entry);
      localStorage.setItem(`${STORAGE_KEY}_${room}`, JSON.stringify(ledger));
  }
}

// ----------------------
// P2P WebRTC
// ----------------------
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export function createPeer(onMessage: (msg: any) => void) {
  const peer = new RTCPeerConnection({ iceServers });
  const channel = peer.createDataChannel("chat");
  channel.onmessage = (e) => onMessage(JSON.parse(e.data));
  return { peer, channel };
}

export function setupReceiver(peer: RTCPeerConnection, onMessage: (msg: any) => void) {
}