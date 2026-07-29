import { X } from 'lucide-react';
import { InputHTMLAttributes, ReactNode } from 'react';

interface ClearableInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  prefix?: ReactNode;
}

export function ClearableInput({
  value,
  onChange,
  wrapperClassName = '',
  className = '',
  type = 'text',
  prefix,
  ...rest
}: ClearableInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      {prefix && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {prefix}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        /* 
          加入 border / focus:border-1 / focus:ring-1 限制边框和环的粗细
          并添加 focus:outline-none 禁用浏览器默认黑框
        */
        className={`w-full input-field text-xs py-1 pr-7 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${prefix ? 'pl-8' : ''
          } ${className}`}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
          tabIndex={-1}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
