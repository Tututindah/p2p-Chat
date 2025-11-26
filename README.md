# Cardano P2P Chat – P2P Secure Messaging

## Overview
A fully decentralized, wallet-authenticated peer-to-peer chat built with **React + WebRTC**.  
After a short handshake through a lightweight WebSocket signaling server, all messages travel directly between browsers – no central chat server stores your data.

### Key Features
- **True P2P** – messages go over a WebRTC `RTCDataChannel` (encrypted, no relay after connection)
- **Wallet-based identity** – Cardano wallet address (via MeshSDK) is used for authentication & room naming
- **Local ledger** – chat history persisted in `localStorage` (`ledger_messages_<roomId>`)
- **Offline queue** – messages sent while the peer is offline are stored locally and delivered when they come online
- **Simple signaling server** – only used for SDP exchange, ICE candidates and presence (Node.js + `ws`)
- Perfect for or any Web3 dApp needing private 1-to-1 chat

## Tech Stack
- React + TypeScript
- MeshSDK (`@meshsdk/react`) – Cardano wallet connection
- WebRTC (native browser APIs)
- WebSocket signaling (`ws` on Node.js)
- `uuid` for message IDs
- `localStorage` for persistence & offline queue

## Prerequisites
- Node.js ≥ 18
- npm / yarn / pnpm
- A Cardano wallet browser extension (Eternl, Nami, Lace, etc.)
- Modern browser with WebRTC support

## Installation & Running

```bash
# 1. Clone & install
clone these repo
cd p2p-Chat
npm install

# 2. Start the signaling server (in a separate terminal)
node relay.js
# → Server listens on ws://localhost:9000

# 3. Run the frontend
npm run dev
# → Open http://localhost:3000 (or your framework's port)
```

### Flow Summary

1. **Wallet connect** → get your Cardano address  
2. **Open WebSocket** → authenticate with `roomId` + address  
3. **Peer A creates offer** → sends SDP via signaling server  
4. **Peer B receives offer** → creates answer → exchange ICE candidates  
5. **Data channel opens** → direct P2P messaging begins  
6. **Messages** are instantly saved to local ledger (`localStorage`)  
7. If peer is offline → messages go into `offline-<roomId>` queue → flushed on reconnect  
8. Presence (`online` / `offline`) shown in the header

## Signaling Server (relay.js)
- Only relays SDP, ICE, and presence
- Stores undelivered messages temporarily (cleared after delivery)
- Very small footprint – < 100 lines

## Security Notes
- All traffic after handshake is end-to-end encrypted by WebRTC
- No server ever sees plaintext messages
- Room membership is enforced by checking wallet addresses

## Contributing
Feel free to open issues or PRs! Main areas for improvement:
- Add end-to-end encryption layer on top of the data channel
- Replace localStorage ledger with IndexedDB for large histories
- Support group chats (multi-party WebRTC mesh or SFU)

Enjoy truly private, wallet-to-wallet chat on Cardano!
```
