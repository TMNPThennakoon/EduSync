import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

/**
 * Beautiful Animated Modal Component
 * Replaces ugly browser confirm/alert dialogs with smooth animations
 */
const AnimatedModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm', // 'confirm', 'alert', 'success', 'error', 'warning'
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmColor = 'blue'
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 200); // Match animation duration
    };

    const handleConfirm = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onConfirm();
            onClose();
        }, 150);
    };

    if (!isOpen && !isAnimating) return null;

    // Icon and color based on type
    const typeConfig = {
        confirm: {
            icon: AlertCircle,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-100',
            buttonColor: 'bg-blue-600 hover:bg-blue-700'
        },
        alert: {
            icon: Info,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-100',
            buttonColor: 'bg-blue-600 hover:bg-blue-700'
        },
        success: {
            icon: CheckCircle,
            iconColor: 'text-green-500',
            iconBg: 'bg-green-100',
            buttonColor: 'bg-green-600 hover:bg-green-700'
        },
        error: {
            icon: AlertTriangle,
            iconColor: 'text-red-500',
            iconBg: 'bg-red-100',
            buttonColor: 'bg-red-600 hover:bg-red-700'
        },
        warning: {
            icon: AlertTriangle,
            iconColor: 'text-yellow-500',
            iconBg: 'bg-yellow-100',
            buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
    };

    const config = typeConfig[type] || typeConfig.confirm;
    const Icon = config.icon;

    return (
        <>
            {/* Backdrop with fade animation */}
            <div
                className={`fixed inset-0 bg-black z-50 transition-opacity duration-200 ${isAnimating ? 'opacity-50' : 'opacity-0'
                    }`}
                onClick={handleClose}
            />

            {/* Modal container with scale + slide animation */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto transform transition-all duration-300 ${isAnimating
                            ? 'scale-100 opacity-100 translate-y-0'
                            : 'scale-95 opacity-0 translate-y-4'
                        }`}
                    style={{
                        animation: isAnimating ? 'modalBounce 0.3s ease-out' : 'none'
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Modal content */}
                    <div className="p-6">
                        {/* Icon with pulse animation */}
                        <div className={`mx-auto w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4 animate-pulse-slow`}>
                            <Icon className={`w-8 h-8 ${config.iconColor}`} />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                            {title}
                        </h3>

                        {/* Message */}
                        <p className="text-gray-600 text-center mb-6">
                            {message}
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            {type === 'confirm' && (
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={type === 'confirm' ? handleConfirm : handleClose}
                                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg ${confirmColor === 'red'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : confirmColor === 'green'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : config.buttonColor
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom animation keyframes */}
            <style jsx>{`
        @keyframes modalBounce {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.02) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
        </>
    );
};

/**
 * Hook to use the modal easily
 * Usage:
 *   const { showModal, ModalComponent } = useModal();
 *   
 *   const handleDelete = () => {
 *     showModal({
 *       title: 'Delete Item?',
 *       message: 'Are you sure you want to delete this item?',
 *       type: 'warning',
 *       confirmColor: 'red',
 *       onConfirm: () => { // delete logic }
 *     });
 *   };
 */
export const useModal = () => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        confirmText: 'OK',
        cancelText: 'Cancel',
        confirmColor: 'blue',
        onConfirm: () => { }
    });

    const showModal = ({
        title,
        message,
        type = 'confirm',
        confirmText = 'OK',
        cancelText = 'Cancel',
        confirmColor = 'blue',
        onConfirm = () => { }
    }) => {
        setModalState({
            isOpen: true,
            title,
            message,
            type,
            confirmText,
            cancelText,
            confirmColor,
            onConfirm
        });
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const ModalComponent = (
        <AnimatedModal
            {...modalState}
            onClose={closeModal}
        />
    );

    return { showModal, ModalComponent, closeModal };
};

export default AnimatedModal;
