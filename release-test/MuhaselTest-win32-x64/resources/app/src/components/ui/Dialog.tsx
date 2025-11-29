import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
        {children}
      </div>
    </div>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ children, dir = 'rtl', className = '' }) => {
  return (
    <div
      dir={dir}
      className={`bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-auto ${className}`}
    >
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return <div className="mb-4">{children}</div>;
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  return <h2 className={`text-xl font-bold ${className}`}>{children}</h2>;
};

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => {
  return <div className={`mt-6 flex justify-end gap-2 ${className}`}>{children}</div>;
};

export const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, title, message, onConfirm }) => {
  const handleClose = () => {
    onOpenChange(false);
    if (onConfirm) onConfirm();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col items-center text-center">
          <DialogTitle>{title}</DialogTitle>
          <div className="my-4 text-gray-700 text-base">{message}</div>
          <button
            type="button"
            className="btn btn-primary w-full mt-2"
            onClick={handleClose}
          >
            إغلاق
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Dialog; 