import { WizardProgressProvider } from "@/components/wizard/WizardProgressContext";
import { WizardShell } from "@/components/wizard/WizardShell";

export default function WizardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WizardProgressProvider>
      <WizardShell>{children}</WizardShell>
    </WizardProgressProvider>
  );
}
