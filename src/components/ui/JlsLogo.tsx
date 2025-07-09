import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { JLS_LOGO_DATA_URL } from "@/lib/logo"

export const JlsLogo = React.forwardRef<
  HTMLImageElement,
  Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'width' | 'height'>
>(({ className, ...props }, ref) => {
  if (!JLS_LOGO_DATA_URL) return null;

  return (
    <Image
      ref={ref}
      src={JLS_LOGO_DATA_URL}
      alt="JLS Finance Logo"
      width={100} // Intrinsic width of the logo image
      height={100} // Intrinsic height of the logo image
      className={cn("h-8 w-8", className)} // Display size can be overridden by className
      unoptimized
      {...props}
    />
  )
});
JlsLogo.displayName = "JlsLogo";
