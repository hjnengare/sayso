// src/components/EventsPage/EventsGrid.tsx
"use client";

import { motion } from "framer-motion";
import EventCard from "../EventCard/EventCard";
import { Event } from "../../data/eventsData";

interface EventsGridProps {
  events: Event[];
  onBookmark: (event: Event) => void;
}

export default function EventsGrid({ events, onBookmark }: EventsGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-5 lg:gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          className="list-none relative group"
          variants={{
            hidden: {
              opacity: 0,
              y: 30,
              scale: 0.95,
            },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 200,
              },
            },
          }}
        >
          <EventCard event={event} onBookmark={onBookmark} index={index} />
        </motion.div>
      ))}
    </motion.div>
  );
}
