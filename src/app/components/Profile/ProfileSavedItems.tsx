"use client";

import React from "react";
import SavedBusinessRow from "@/app/components/Saved/SavedBusinessRow";
import type { Business } from "@/app/components/BusinessCard/BusinessCard";

interface ProfileSavedItemsProps {
  savedBusinesses: Business[];
}

export function ProfileSavedItems({ savedBusinesses }: ProfileSavedItemsProps) {
  if (!savedBusinesses || savedBusinesses.length === 0) {
    return null;
  }

  return (
    <SavedBusinessRow
      title="Saved Businesses"
      businesses={savedBusinesses}
      showCount={true}
    />
  );
}
