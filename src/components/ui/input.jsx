import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("tetris-room-input", className)}
      {...props}
    />
  );
}

export { Input };
