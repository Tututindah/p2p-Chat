import { useState, useEffect } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { useRouter } from "next/router";

interface Contact {
  name: string;
  address: string;
}

export default function Home() {
  const { connected, wallet } = useWallet();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("my_contacts");
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  const addContact = () => {
    const address = prompt("Enter Friend's Wallet Address (addr1...)");
    if (!address) return;
    // Basic validation
    if (!address.startsWith("addr1") && !address.startsWith("addr_test")) {
        alert("Invalid Cardano Address");
        return;
    }
    const name = prompt("Enter Nickname") || "Friend";
    
    const newContacts = [...contacts, { name, address }];
    setContacts(newContacts);
    localStorage.setItem("my_contacts", JSON.stringify(newContacts));
  };

  const openChat = async (friendAddress: string) => {
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      // 1. Get My Address (BrowserWallet logic)
      const myAddress = await wallet.getChangeAddress();

      // 2. Generate Deterministic Room ID
      // Sort addresses alphabetically so Alice->Bob and Bob->Alice create the SAME ID.
      const roomId = [myAddress, friendAddress].sort().join("_");

      // 3. Go to Chat
      router.push(`/chat/${roomId}?friend=${friendAddress}`);
    } catch (e) {
      console.error("Error getting address:", e);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Cardano Secure Chat</h1>
        <div style={{ zoom: 0.8 }}>
           <CardanoWallet isDark={true} />
        </div>
      </div>

      <div className="content">
        {!connected ? (
          <div className="placeholder">
            <p>Please connect your wallet to view chats.</p>
          </div>
        ) : (
          <div className="contact-list">
             <button className="add-btn" onClick={addContact}>+ New Chat</button>
             {contacts.length === 0 && <p style={{textAlign:'center', color:'#888'}}>No contacts yet.</p>}
             
             {contacts.map((c, i) => (
               <div key={i} className="contact-row" onClick={() => openChat(c.address)}>
                 <div className="avatar">👤</div>
                 <div className="info">
                   <span className="name">{c.name}</span>
                   <span className="addr">{c.address.slice(0, 15)}...</span>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .app-container { max-width: 500px; margin: 0 auto; background: #fff; height: 100vh; display: flex; flex-direction: column; border-left: 1px solid #eee; border-right: 1px solid #eee; }
        .header { background: #075e54; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .content { flex: 1; overflow-y: auto; background: #e5ddd5; }
        .placeholder { display: flex; height: 100%; align-items: center; justify-content: center; color: #555; }
        .contact-list { padding: 10px; }
        .add-btn { width: 100%; padding: 12px; background: #25d366; color: white; border: none; font-weight: bold; border-radius: 8px; margin-bottom: 10px; cursor: pointer; }
        .contact-row { background: white; padding: 10px; border-radius: 8px; display: flex; align-items: center; cursor: pointer; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .avatar { width: 40px; height: 40px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; }
        .info { display: flex; flex-direction: column; }
        .name { font-weight: bold; font-size: 16px; }
        .addr { font-size: 12px; color: #777; }
      `}</style>
    </div>
  );
}