import type { NextPageContext } from "next";

interface ErrorPageProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <p style={{ marginBottom: 12, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8" }}>
          ShieldBet
        </p>
        <h1 style={{ marginBottom: 12, fontSize: 32, fontWeight: 700 }}>
          {statusCode ? `Error ${statusCode}` : "Unexpected error"}
        </h1>
        <p style={{ margin: 0, color: "#cbd5e1" }}>
          Something went wrong while rendering this page.
        </p>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode || err?.statusCode || 500;
  return { statusCode };
};

export default ErrorPage;
