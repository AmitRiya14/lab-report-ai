// src/components/ExitIntentModal.tsx
import React from 'react';
import { X, Phone, Mail } from 'lucide-react';

interface ExitIntentModalProps {
  onClose: () => void;
}

export const ExitIntentModal: React.FC<ExitIntentModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Leaving so soon?
          </h2>
          <p className="text-gray-600 mb-4">
            Can't find anything to your liking? We value you and want to help you in the best way possible.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 mb-2">
              Contact the developer directly for a response within minutes.
            </p>
            <div className="flex items-center justify-center gap-4">
                <a href="tel:6476214365" className="flex items-center gap-2 text-gray-800 font-medium">
                    <Phone size={16} />
                    647-621-4365
                </a>
                <a href="mailto:amitbijlani13@gmail.com" className="flex items-center gap-2 text-gray-800 font-medium">
                    <Mail size={16} />
                    amitbijlani13@gmail.com
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};