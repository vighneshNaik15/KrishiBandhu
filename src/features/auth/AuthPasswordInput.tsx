'use client';

import type { ComponentPropsWithRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';

type AuthPasswordProps = Omit<ComponentPropsWithRef<typeof Input>, 'type' | 'leftIcon' | 'rightIcon'> & {
  visible: boolean;
  onToggle: () => void;
};

export function AuthPasswordInput({ visible, onToggle, className, ...props }: AuthPasswordProps) {
  return (
    <Input
      {...props}
      className={['auth-password-field', className].filter(Boolean).join(' ')}
      type={visible ? 'text' : 'password'}
      leftIcon={<Lock aria-hidden className="size-4" />}
      rightIcon={(
        <button
          type="button"
          onClick={onToggle}
          disabled={props.disabled}
          className="auth-password-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      )}
    />
  );
}
