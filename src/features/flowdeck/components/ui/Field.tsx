'use client';

import React, { useId } from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';

/** HTML tags that a <label htmlFor> can be programmatically bound to. */
const FORM_CONTROL_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: COLORS.gray,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontFamily: FF,
  display: 'block',
};

/**
 * Form field wrapper.
 *
 * When the wrapped child is a bare form control (input/select/textarea), the
 * label text is rendered as a real <label htmlFor> bound to a generated id —
 * screen readers then announce the field name instead of placeholder-only
 * content (audit H-28). When the child is any other element (a group, a
 * custom picker, a toolbar), the label renders as a plain section header, as
 * before — a <label> pointing at a <div> would be invalid.
 */
export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const id = useId();
  const isFormControl =
    React.isValidElement(children) &&
    typeof children.type === 'string' &&
    FORM_CONTROL_TAGS.has(children.type);

  return (
    <div style={{ marginBottom: 16 }}>
      {isFormControl ? (
        <label htmlFor={id} style={labelStyle}>{label}</label>
      ) : (
        <div style={labelStyle}>{label}</div>
      )}
      {isFormControl
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
