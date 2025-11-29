export interface FooterSettings {
  showInReports: boolean;
  showInReceipts: boolean;
  showInInstallments: boolean;
  footerText?: string;
  contactInfo: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
  };
  logo?: {
    show: boolean;
    url?: string;
  };
}