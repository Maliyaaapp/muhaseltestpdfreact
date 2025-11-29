import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FooterSettings } from '../interfaces/FooterSettings';

interface ReportSettings {
  footerSettings: FooterSettings;
}

interface ReportSettingsContextType {
  settings: ReportSettings;
  updateSettings: (newSettings: Partial<ReportSettings>) => void;
  updateFooterSettings: (newFooterSettings: Partial<FooterSettings>) => void;
}

const defaultFooterSettings: FooterSettings = {

  showInReports: true,
  showInReceipts: true,
  showInInstallments: true,
  contactInfo: {},
  logo: {
    show: false
  }
};

const defaultSettings: ReportSettings = {
  footerSettings: defaultFooterSettings,
};

const ReportSettingsContext = createContext<ReportSettingsContextType | undefined>(undefined);

export const useReportSettings = () => {
  const context = useContext(ReportSettingsContext);
  if (!context) {
    throw new Error('useReportSettings must be used within a ReportSettingsProvider');
  }
  return context;
};

interface ReportSettingsProviderProps {
  children: ReactNode;
}

export const ReportSettingsProvider: React.FC<ReportSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ReportSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<ReportSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  const updateFooterSettings = (newFooterSettings: Partial<FooterSettings>) => {
    setSettings(prev => ({
      ...prev,
      footerSettings: {
        ...prev.footerSettings,
        ...newFooterSettings,
      },
    }));
  };

  return (
    <ReportSettingsContext.Provider value={{ settings, updateSettings, updateFooterSettings }}>
      {children}
    </ReportSettingsContext.Provider>
  );
};

export default ReportSettingsContext;