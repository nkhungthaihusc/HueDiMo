"use client";

import type { ComponentProps } from "react";

type MoneyInputProps = Omit<ComponentProps<"input">, "type" | "inputMode" | "value" | "onChange"> & {
  value: string | number;
  onValueChange: (digits: string) => void;
};

function formatDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  const display = formatDigits(String(value));

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(event) => {
        const input = event.currentTarget;
        const cursor = input.selectionStart ?? input.value.length;
        const digits = input.value.replace(/\D/g, "");
        const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, "").length;
        const formatted = formatDigits(digits);
        let position = 0;
        let remaining = digitsBeforeCursor;
        while (position < formatted.length && remaining > 0) {
          if (formatted[position] !== ".") remaining--;
          position++;
        }
        input.value = formatted;
        input.setSelectionRange(position, position);
        onValueChange(digits);
      }}
    />
  );
}
