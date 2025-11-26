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

// Chat Item Component - Mobile First
function ChatItem({ chat }: { chat: Chat }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/dm/${chat.id}`}
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-sage via-sage/95 to-sage/90 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/40 ring-1 ring-white/30 hover:bg-sage/90 hover:border-white/60 active:scale-[0.98] sm:hover:-translate-y-1 transition-all duration-300 touch-manipulation"
    >
      {/* Profile Picture - Mobile First */}
      <div className="relative flex-shrink-0">
        {!imgError && chat.user.profilePicture && chat.user.profilePicture.trim() !== "" ? (
          <Image
            src={chat.user.profilePicture}
            alt={chat.user.name}
            width={48}
            height={48}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/50 ring-2 ring-white/30"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-sage/20 text-sage rounded-full border-2 border-white/50 ring-2 ring-white/30">
            <User className="text-sage/70 w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}

        {/* Online Status */}
        {chat.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white ring-1 ring-white/50"></div>
        )}

        {/* Verified Badge */}
        {chat.user.badge === "verified" && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
            <Check className="text-white w-2.5 h-2.5 sm:w-2.5 sm:h-2.5" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Chat Info - Mobile First */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-2">
          <h3 className="text-sm sm:text-body font-600 text-charcoal truncate group-hover:text-charcoal/90 transition-colors duration-200">
            {chat.user.name}
          </h3>
          <span className="text-xs sm:text-caption text-charcoal/70 flex-shrink-0">
            {chat.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-caption text-charcoal/80 truncate flex-1">
            {chat.lastMessage}
          </p>
          {chat.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] sm:min-w-[24px] h-5 sm:h-6 px-1.5 sm:px-2 bg-coral text-white text-xs sm:text-caption font-semibold rounded-full flex items-center justify-center">
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
      {/* Header - Mobile First */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/95 backdrop-blur-sm border-b border-charcoal/10 shadow-md md:shadow-none">
        <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="group flex items-center touch-manipulation"
              aria-label="Go back"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 active:from-white/20 active:to-white/10 sm:hover:from-white/20 sm:hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:scale-110 border border-white/20 active:border-white/40 sm:hover:border-white/40 mr-2 sm:mr-3 md:mr-4">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-colors duration-300" strokeWidth={2.5} />
              </div>
              <h3 className="font-urbanist text-lg sm:text-h3 md:text-h2 font-semibold text-white transition-all duration-300 group-active:text-white/80 sm:group-hover:text-white/80 relative truncate max-w-[120px] sm:max-w-[150px] md:max-w-none">
                Messages
              </h3>
            </button>
          </div>
        </div>
      </header>

      {/* Chat List - Mobile First */}
      <main className="mx-auto w-full max-w-[2000px] px-3 sm:px-4 pt-20 sm:pt-16 md:pt-14 py-4 sm:py-6">
        {/* Breadcrumb */}
        <nav className="px-2 pt-8 pb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-body-sm text-charcoal/60">
            <li>
              <Link href="/home" className="hover:text-charcoal transition-colors" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                Home
              </Link>
            </li>
            <li className="text-charcoal/40">/</li>
            <li className="text-charcoal font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Messages</li>
          </ol>
        </nav>

        {/* Search Bar - Mobile First (matches explore page style) */}
        <div className="py-4 mb-6">
          <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-charcoal/20 text-base placeholder:text-base placeholder:text-charcoal/40 font-normal text-charcoal focus:outline-none focus:border-charcoal/60 hover:border-charcoal/30 transition-all duration-200 py-3 px-0 pr-2 touch-manipulation"
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  fontSize: '16px', // Prevent zoom on iOS
                }}
                aria-label="Search conversations"
              />
            </div>
          </form>
        </div>

        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-charcoal/20 mb-3 sm:mb-4" strokeWidth={1.5} />
            <p className="text-sm sm:text-body-sm md:text-body text-charcoal/60 mb-1.5 sm:mb-2">No conversations found</p>
            <p className="text-xs sm:text-caption text-charcoal/40">Try adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}
      </main>

      {/* Empty State for No Chats - Mobile First */}
      {chats.length === 0 && filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center px-4">
          <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 text-charcoal/20 mb-4 sm:mb-6" strokeWidth={1.5} />
          <h2 className="text-xl sm:text-h2 md:text-h1 font-600 text-charcoal mb-1.5 sm:mb-2">No messages yet</h2>
          <p className="text-sm sm:text-body-sm md:text-body text-charcoal/60 max-w-md">
            Start a conversation with reviewers and community members to get started!
          </p>
        </div>
      )}

      <Footer />
      </motion.div>
    </AnimatePresence>
  );
}

