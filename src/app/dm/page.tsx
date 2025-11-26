"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, User, Check, ArrowLeft } from "react-feather";
import { TOP_REVIEWERS, type Reviewer } from "../data/communityHighlightsData";
import Footer from "../components/Footer/Footer";

interface Chat {
  id: string;
  user: Reviewer;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
}

// Chat Item Component
function ChatItem({ chat }: { chat: Chat }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/dm/${chat.id}`}
      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-sage via-sage/95 to-sage/90 backdrop-blur-xl rounded-2xl border border-white/40 ring-1 ring-white/30 hover:bg-sage/90 hover:border-white/60 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Profile Picture */}
      <div className="relative flex-shrink-0">
        {!imgError && chat.user.profilePicture && chat.user.profilePicture.trim() !== "" ? (
          <Image
            src={chat.user.profilePicture}
            alt={chat.user.name}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/50 ring-2 ring-white/30"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-14 h-14 flex items-center justify-center bg-sage/20 text-sage rounded-full border-2 border-white/50 ring-2 ring-white/30">
            <User className="text-sage/70" size={28} />
          </div>
        )}

        {/* Online Status */}
        {chat.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white ring-1 ring-white/50"></div>
        )}

        {/* Verified Badge */}
        {chat.user.badge === "verified" && (
          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
            <Check className="text-white" size={10} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-body-sm sm:text-body font-600 text-charcoal truncate group-hover:text-charcoal/90 transition-colors duration-200">
            {chat.user.name}
          </h3>
          <span className="text-caption text-charcoal/70 flex-shrink-0 ml-2">
            {chat.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption text-charcoal/80 truncate flex-1">
            {chat.lastMessage}
          </p>
          {chat.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[24px] h-6 px-2 bg-coral text-white text-caption font-semibold rounded-full flex items-center justify-center">
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Generate dummy chat data from reviewers
const generateDummyChats = (): Chat[] => {
  const lastMessages = [
    "Hey! Thanks for reaching out. I'd love to chat!",
    "Hi! I really enjoyed reading your reviews.",
    "Thank you so much! That means a lot.",
    "Great to hear from you! How can I help?",
    "I saw your review about that restaurant. I totally agree!",
    "Thanks for the recommendation! I'll check it out.",
    "That's a great point. I had a similar experience.",
    "Looking forward to chatting more about this!",
  ];

  const timestamps = [
    "Just now",
    "2 minutes ago",
    "15 minutes ago",
    "1 hour ago",
    "2 hours ago",
    "Yesterday",
    "2 days ago",
    "Last week",
  ];

  return TOP_REVIEWERS.slice(0, 8).map((reviewer, index) => ({
    id: reviewer.id,
    user: reviewer,
    lastMessage: lastMessages[index % lastMessages.length],
    timestamp: timestamps[index % timestamps.length],
    // Use deterministic values based on index to avoid hydration mismatch
    unreadCount: index < 3 ? (index % 3) + 1 : 0,
    online: index < 4,
  }));
};

export default function DMChatListPage() {
  const router = useRouter();
  const [chats] = useState<Chat[]>(generateDummyChats());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dm-list"
        initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.5 },
          filter: { duration: 0.55 }
        }}
        className="min-h-dvh bg-off-white font-urbanist"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/95 backdrop-blur-sm border-b border-charcoal/10">
        <div className="mx-auto w-full max-w-[2000px] px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="group flex items-center"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-3 sm:mr-4">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
              </div>
              <h3 className="font-urbanist text-h3 sm:text-h2 font-semibold text-white transition-all duration-300 group-hover:text-white/80 relative truncate max-w-[150px] sm:max-w-none">
                Messages
              </h3>
            </button>
          </div>

          {/* Search Bar - styled like explore */}
          <form onSubmit={(e) => e.preventDefault()} className="relative">
            <div className="relative">
              {/* Search icon on the left */}
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-white/20 text-body placeholder:text-body placeholder:text-white/40 font-normal text-white focus:outline-none focus:border-white/60 hover:border-white/30 transition-all duration-200 pl-8 pr-2 py-3"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
                aria-label="Search conversations"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Chat List */}
      <main className="mx-auto w-full max-w-[2000px] px-4 pt-28 md:pt-20 py-6">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-charcoal/20 mb-4" strokeWidth={1.5} />
            <p className="text-body-sm sm:text-body text-charcoal/60 mb-2">No conversations found</p>
            <p className="text-caption text-charcoal/40">Try adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}
      </main>

      {/* Empty State for No Chats */}
      {chats.length === 0 && filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <MessageCircle className="w-20 h-20 text-charcoal/20 mb-6" strokeWidth={1.5} />
          <h2 className="text-h2 sm:text-h1 font-600 text-charcoal mb-2">No messages yet</h2>
          <p className="text-body-sm sm:text-body text-charcoal/60 max-w-md">
            Start a conversation with reviewers and community members to get started!
          </p>
        </div>
      )}

      <Footer />
      </motion.div>
    </AnimatePresence>
  );
}

