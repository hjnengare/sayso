'use client';

import React from 'react';
import { Lock, Eye, Globe, Database, Download } from 'lucide-react';
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { ExpandableSection } from '@/components/atoms/ExpandableSection';

export interface DataRightsSectionProps {
  activeSection: string | null;
  onToggleSection: (section: string) => void;
  onExportData: () => void;
  onDeleteData: () => void;
}

export const DataRightsSection: React.FC<DataRightsSectionProps> = ({
  activeSection,
  onToggleSection,
  onExportData,
  onDeleteData,
}) => {
  return (
    <SettingsCard icon={Lock} title="Your Data Rights" iconColor="coral">
      <div className="space-y-4">
        <ExpandableSection
          icon={Eye}
          label="Access Your Data"
          isExpanded={activeSection === 'access'}
          onToggle={() => onToggleSection('access')}
          showBorder={false}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-charcoal/70">
              You have the right to access all personal data we have about you.
            </p>
            <button
              onClick={onExportData}
              className="px-6 py-2 rounded-full text-sm font-600 font-urbanist bg-coral text-white hover:bg-coral/90 transition-all duration-300 shadow-lg inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export My Data
            </button>
          </div>
        </ExpandableSection>

        <ExpandableSection
          icon={Globe}
          label="Data Sharing"
          isExpanded={activeSection === 'sharing'}
          onToggle={() => onToggleSection('sharing')}
          showBorder={false}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-charcoal/70 mb-2">
              We only share your data with trusted partners and services to provide you with the best experience:
            </p>
            <ul className="list-disc list-inside text-sm text-charcoal/70 space-y-2 ml-2">
              <li>Service providers and analytics tools</li>
              <li>Businesses you interact with</li>
              <li>Legal compliance requirements</li>
            </ul>
            <p className="text-sm text-charcoal/70 mt-4">
              We never sell your personal information.
            </p>
          </div>
        </ExpandableSection>

        <ExpandableSection
          icon={Database}
          label="Delete All Data"
          isExpanded={activeSection === 'delete'}
          onToggle={() => onToggleSection('delete')}
          showBorder={false}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-charcoal/70">
              Permanently delete all your personal data from our systems. This action cannot be undone.
            </p>
            <button
              onClick={onDeleteData}
              className="px-6 py-2 rounded-full text-sm font-600 font-urbanist bg-white/40 text-coral border border-coral hover:bg-coral hover:text-white transition-all duration-300"
            >
              Delete All My Data
            </button>
          </div>
        </ExpandableSection>
      </div>
    </SettingsCard>
  );
};

