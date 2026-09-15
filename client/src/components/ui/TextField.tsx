import { type InputHTMLAttributes, forwardRef } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:ring-2 focus:ring-brand-500 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
          {...rest}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
