"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { ThemeProvider, useTheme } from "next-themes";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { zamaChain } from "@/lib/chain";
import { useMemo, useState } from "react";

const wagmiConfig = createConfig({
  chains: [zamaChain],
  connectors: [injected()],
  transports: {
    [zamaChain.id]: http(zamaChain.rpcUrls.default.http[0])
  },
  ssr: true
});

function WalletLayer({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const theme = useMemo(() => {
    if (resolvedTheme === "light") {
      return lightTheme({
        accentColor: "#00e4b4",
        accentColorForeground: "#081018",
        borderRadius: "large",
        fontStack: "system"
      });
    }

    return darkTheme({
      accentColor: "#00e4b4",
      accentColorForeground: "#081018",
      borderRadius: "large",
      fontStack: "system",
      overlayBlur: "small"
    });
  }, [resolvedTheme]);

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletLayer>{children}</WalletLayer>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
