"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    MessageSquare,
    Send,
    User,
    Users,
    Check,
    Award,
    MapPin,
    MoreVertical,
} from "react-feather";
import Footer from "../../components/Footer/Footer";
import { TOP_REVIEWERS, type Reviewer } from "../../data/communityHighlightsData";

// CSS animations
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideInFromBottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-slide-in-bottom {
    animation: slideInFromBottom 0.3s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    read: boolean;
}

interface DMUser {
    id: string;
    name: string;
    profilePicture: string;
    badge?: "top" | "verified" | "local";
    location: string;
    online?: boolean;
}

export default function DMPage() {
    const params = useParams();
    const router = useRouter();
    const recipientId = params?.id as string;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [imgError, setImgError] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Mock recipient data (replace with API in production)
    const recipient: DMUser = useMemo(() => {
        const reviewer = TOP_REVIEWERS.find(r => r.id === recipientId) || TOP_REVIEWERS[0];
        return {
            id: reviewer.id,
            name: reviewer.name,
            profilePicture: reviewer.profilePicture,
            badge: reviewer.badge,
            location: reviewer.location,
            online: true,
        };
    }, [recipientId]);

    // Mock messages (replace with API in production)
    useEffect(() => {
        const mockMessages: Message[] = [
            {
                id: "1",
                senderId: recipientId,
                text: "Hey! Thanks for reaching out. I'd love to chat about your recent review!",
                timestamp: "2 hours ago",
                read: true,
            },
            {
                id: "2",
                senderId: "current-user",
                text: "Hi! I really enjoyed reading your reviews. You have great insights!",
                timestamp: "1 hour ago",
                read: true,
            },
            {
                id: "3",
                senderId: recipientId,
                text: "Thank you so much! That means a lot. I try to be thorough and honest in my reviews.",
                timestamp: "45 minutes ago",
                read: true,
            },
        ];
        setMessages(mockMessages);
    }, [recipientId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle send message
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: "current-user",
            text: message.trim(),
            timestamp: "Just now",
            read: false,
        };

        setMessages([...messages, newMessage]);
        setMessage("");

        // Auto-resize textarea
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    // Handle Enter key (Shift+Enter for new line, Enter to send)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            <style jsx global>{`
                .font-urbanist {
                    font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <AnimatePresence mode="wait">
                <motion.div
                    key={recipientId}
                    initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
                    transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        opacity: { duration: 0.5 },
                        filter: { duration: 0.55 }
                    }}
                    className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist flex flex-col"
                    style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                >
                {/* Fixed Premium Header */}
                <header
                    className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/95 backdrop-blur-sm border-b border-charcoal/10 animate-slide-in-top"
                    role="banner"
                    style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                >
                    <div className="mx-auto w-full max-w-[2000px] px-2 py-4">
                        <nav className="flex items-center justify-between" aria-label="Direct message navigation">
                            <button
                                onClick={() => router.back()}
                                className="group flex items-center focus:outline-none rounded-lg px-1 -mx-1"
                                aria-label="Go back to previous page"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-2 sm:mr-3" aria-hidden="true">
                                    <ArrowLeft className="w-6 h-6 text-white group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
                                </div>
                            </button>

                            {/* Recipient Info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0 mx-4">
                                {!imgError && recipient.profilePicture && recipient.profilePicture.trim() !== '' ? (
                                    <div className="relative flex-shrink-0">
                                        <Image
                                            src={recipient.profilePicture}
                                            alt={recipient.name}
                                            width={40}
                                            height={40}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-white/50 ring-2 ring-white/30"
                                            priority
                                            onError={() => setImgError(true)}
                                        />
                                        {recipient.online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white ring-1 ring-white/50"></div>
                                        )}
                                        {recipient.badge === "verified" && (
                                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                                                <Check className="text-white" size={8} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center bg-sage/20 text-sage rounded-full border-2 border-white/50 ring-2 ring-white/30 flex-shrink-0">
                                        <User className="text-sage/70" size={20} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <h1 className="font-urbanist text-body-sm sm:text-body font-700 text-white animate-delay-100 animate-fade-in truncate" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                                        {recipient.name}
                                    </h1>
                                    {recipient.online && (
                                        <p className="text-caption text-white/70 truncate" style={{
                                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        }}>
                                            Online
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                className="w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 min-h-[44px] min-w-[44px]"
                                aria-label="More options"
                            >
                                <MoreVertical className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </button>
                        </nav>
                    </div>
                </header>

                {/* Messages Container */}
                <div className="flex-1 flex flex-col pt-20 pb-24 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8">
                        <div className="max-w-3xl mx-auto py-6 space-y-4">
                            {messages.map((msg) => {
                                const isCurrentUser = msg.senderId === "current-user";
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                                    >
                                        <div
                                            className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-3 ${
                                                isCurrentUser
                                                    ? 'bg-gradient-to-br from-coral to-coral/90 text-white border border-white/30'
                                                    : 'bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl text-charcoal border border-white/60 ring-1 ring-white/30'
                                            }`}
                                            style={{
                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                            }}
                                        >
                                            <p className="text-body-sm sm:text-body leading-relaxed whitespace-pre-wrap break-words" style={{
                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                            }}>
                                                {msg.text}
                                            </p>
                                            <div className={`flex items-center gap-1 mt-2 text-caption ${
                                                isCurrentUser ? 'text-white/70' : 'text-charcoal/50'
                                            }`} style={{
                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                            }}>
                                                <span>{msg.timestamp}</span>
                                                {isCurrentUser && msg.read && (
                                                    <Check className="w-3 h-3" strokeWidth={2.5} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>

                {/* Message Input */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-off-white border-t border-charcoal/10 animate-slide-in-bottom">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4">
                        <form onSubmit={handleSend} className="flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={message}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    rows={1}
                                    className="w-full bg-white border border-charcoal/10 rounded-[20px] px-4 py-3 pr-12 text-body-sm sm:text-body text-charcoal placeholder:text-body-sm sm:placeholder:text-body placeholder-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-300 max-h-[120px] overflow-y-auto"
                                    style={{
                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        lineHeight: '1.5',
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!message.trim()}
                                className="w-12 h-12 bg-gradient-to-br from-coral to-coral/90 hover:bg-coral/90 disabled:bg-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center border border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 min-h-[48px] min-w-[48px]"
                                aria-label="Send message"
                            >
                                <Send className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                        </form>
                    </div>
                </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
}

