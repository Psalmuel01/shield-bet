export default function AppTemplate({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="page-enter">{children}</div>;
}
