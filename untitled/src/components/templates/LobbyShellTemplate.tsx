import React from 'react';

interface LobbyShellTemplateProps {
  header: React.ReactNode;
  heroVisual: React.ReactNode;
  setupPanel: React.ReactNode;
  footerRules: React.ReactNode;
  modal?: React.ReactNode;
}

export const LobbyShellTemplate: React.FC<LobbyShellTemplateProps> = ({
  header,
  heroVisual,
  setupPanel,
  footerRules,
  modal,
}) => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#161B22] text-slate-100">
      {header}

      <main className="flex-1 w-full max-w-[1220px] mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <section className="lg:col-span-7 flex flex-col">{heroVisual}</section>
          <section className="lg:col-span-5 flex flex-col">{setupPanel}</section>
        </div>

        <section className="pt-6 border-t border-[#2A3647]">{footerRules}</section>
      </main>

      {modal}
    </div>
  );
};
