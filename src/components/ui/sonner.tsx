"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        style: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
