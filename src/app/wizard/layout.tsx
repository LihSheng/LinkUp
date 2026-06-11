import { WizardShell } from "@/components/wizard/WizardShell";

export default function WizardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WizardShell>{children}</WizardShell>;
}
