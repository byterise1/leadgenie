type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  secondLabel?: string;
  onSecond?: () => void;
};

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, secondLabel, onSecond }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end flex-wrap">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          {secondLabel && onSecond && (
            <button onClick={onSecond}
              className="px-4 py-2 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-colors">
              {secondLabel}
            </button>
          )}
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
