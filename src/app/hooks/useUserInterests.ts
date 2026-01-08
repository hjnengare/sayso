"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook to fetch the current user's interests from the database
 * Returns the user's selected interests as an array of interest IDs
 */
export function useUserInterests(): string[] {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setInterests([]);
      return;
    }

    const fetchUserInterests = async () => {
      try {
        // NEVER cache onboarding data - always fetch fresh
        const response = await fetch("/api/user/onboarding", {
          cache: 'no-store',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setInterests(data.interests || []);
        } else {
          console.error("Failed to fetch user interests");
          setInterests([]);
        }
      } catch (error) {
        console.error("Error fetching user interests:", error);
        setInterests([]);
      }
    };

    fetchUserInterests();
  }, [user]);

  return interests;
}

