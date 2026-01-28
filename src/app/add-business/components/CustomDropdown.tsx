"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
    className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    value,
    onChange,
    placeholder,
    options,
    className = 'flex-1'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Position dropdown using portal
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8 + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const displayValue = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`}>
            <motion.button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                className="w-full bg-off-white rounded-[12px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl pl-4 pr-10 py-3 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/30 focus:border-navbar-bg transition-colors duration-200 hover:shadow-[0_8px_40px_rgba(0,0,0,0.15)] cursor-pointer text-left flex items-center justify-between"
            >
                <span className={value ? 'text-charcoal' : 'text-charcoal/70'}>{displayValue}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={16} />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isOpen && dropdownPos && typeof window !== 'undefined' && createPortal(
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="fixed z-[10000] bg-off-white rounded-[12px] border border-white/60 shadow-[0_16px_48px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-navbar-bg/20 scrollbar-track-transparent"
                        style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((option, index) => (
                            <motion.button
                                key={index}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                whileHover={{ backgroundColor: 'rgba(139, 169, 139, 0.1)' }}
                                className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 ${
                                    option.value === value
                                        ? 'bg-gradient-to-r from-sage/10 to-sage/5 text-charcoal'
                                        : 'text-charcoal'
                                }`}
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                            >
                                {option.label}
                            </motion.button>
                        ))}
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDropdown;
