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
    if (resolvedTheme === "dark") {
      return darkTheme({
        accentColor: "#6366F1",
        accentColorForeground: "#ffffff",
        borderRadius: "medium",
        fontStack: "system"
      });
    }

    return lightTheme({
      accentColor: "#6366F1",
      accentColorForeground: "#ffffff",
      borderRadius: "medium",
      fontStack: "system"
    });
  }, [resolvedTheme]);

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletLayer>{children}</WalletLayer>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
