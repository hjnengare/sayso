/**
 * Unit tests for BusinessDescription component
 * 
 * Tests:
 * - Renders string description correctly
 * - Renders object description with friendly text
 * - Falls back to raw when friendly is missing
 * - Handles null/undefined descriptions
 * - Handles edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BusinessDescription from '../../src/app/components/BusinessDetail/BusinessDescription';

describe('BusinessDescription', () => {
  describe('String Description', () => {
    it('should render string description correctly', () => {
      const description = 'This is a great restaurant with amazing food and service.';
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText('About This Business')).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    });

    it('should render empty string description with fallback', () => {
      render(<BusinessDescription description="" />);
      
      expect(screen.getByText(/Discover this exceptional business/)).toBeInTheDocument();
    });
  });

  describe('Object Description', () => {
    it('should render friendly text when object has both raw and friendly', () => {
      const description = {
        raw: 'Raw description text',
        friendly: 'This is a user-friendly description of the business'
      };
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText('About This Business')).toBeInTheDocument();
      expect(screen.getByText(description.friendly)).toBeInTheDocument();
      expect(screen.queryByText(description.raw)).not.toBeInTheDocument();
    });

    it('should fall back to raw when friendly is missing', () => {
      const description = {
        raw: 'Raw description text only',
        friendly: ''
      };
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText(description.raw)).toBeInTheDocument();
    });

    it('should fall back to raw when friendly is null', () => {
      const description = {
        raw: 'Raw description text',
        friendly: null as any
      };
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText(description.raw)).toBeInTheDocument();
    });

    it('should handle object with only raw property', () => {
      const description = {
        raw: 'Only raw text available'
      };
      
      render(<BusinessDescription description={description as any} />);
      
      expect(screen.getByText(description.raw)).toBeInTheDocument();
    });

    it('should use fallback when object has empty raw and no friendly', () => {
      const description = {
        raw: '',
        friendly: ''
      };
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText(/Discover this exceptional business/)).toBeInTheDocument();
    });
  });

  describe('Null/Undefined Description', () => {
    it('should render fallback message when description is null', () => {
      render(<BusinessDescription description={null} />);
      
      expect(screen.getByText('About This Business')).toBeInTheDocument();
      expect(screen.getByText(/Discover this exceptional business/)).toBeInTheDocument();
    });

    it('should render fallback message when description is undefined', () => {
      render(<BusinessDescription description={undefined} />);
      
      expect(screen.getByText('About This Business')).toBeInTheDocument();
      expect(screen.getByText(/Discover this exceptional business/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      
      render(<BusinessDescription description={longDescription} />);
      
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle description with special characters', () => {
      const description = 'Restaurant & Café - "Best" food in town!';
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText(description)).toBeInTheDocument();
    });

    it('should handle description with HTML-like content', () => {
      const description = 'Visit us at <b>123 Main St</b> for great food!';
      
      render(<BusinessDescription description={description} />);
      
      expect(screen.getByText(description)).toBeInTheDocument();
    });

    it('should handle object with unexpected properties', () => {
      const description = {
        raw: 'Raw text',
        friendly: 'Friendly text',
        unexpected: 'This should be ignored'
      };
      
      render(<BusinessDescription description={description as any} />);
      
      expect(screen.getByText(description.friendly)).toBeInTheDocument();
      expect(screen.queryByText(description.unexpected)).not.toBeInTheDocument();
    });

    it('should handle malformed object (no raw or friendly)', () => {
      const description = {
        other: 'Some other property'
      };
      
      render(<BusinessDescription description={description as any} />);
      
      // Should fall back to default message
      expect(screen.getByText(/Discover this exceptional business/)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render with correct heading', () => {
      render(<BusinessDescription description="Test description" />);
      
      const heading = screen.getByText('About This Business');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('should render description in paragraph tag', () => {
      const description = 'Test description text';
      render(<BusinessDescription description={description} />);
      
      const paragraph = screen.getByText(description);
      expect(paragraph.tagName).toBe('P');
    });

    it('should have correct styling classes', () => {
      const { container } = render(<BusinessDescription description="Test" />);
      
      const card = container.querySelector('.bg-gradient-to-br');
      expect(card).toBeInTheDocument();
    });
  });
});

