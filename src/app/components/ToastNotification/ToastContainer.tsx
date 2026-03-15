"use client";

import { AnimatePresence } from "framer-motion";
import ToastNotification, {
  ToastNotificationData,
} from "./ToastNotification";

interface ToastContainerProps {
  notifications: ToastNotificationData[];
  onRemove: (id: string) => void;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
  duration?: number;
}

const positionClasses = {
  "top-right": "top-4 right-4",
  "bottom-right": "bottom-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-left": "bottom-4 left-4",
};

export default function ToastContainer({
  notifications,
  onRemove,
  position = "bottom-right",
  duration = 5000,
}: ToastContainerProps) {
  return (
    <div
      className={`fixed ${positionClasses[position]} z-[100000] flex flex-col gap-3 pointer-events-none`}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <ToastNotification
              notification={notification}
              onClose={() => onRemove(notification.id)}
              duration={duration}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
