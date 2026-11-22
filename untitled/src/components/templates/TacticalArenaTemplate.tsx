import React from 'react';

interface TacticalArenaTemplateProps {
  hud: React.ReactNode;
  stage: React.ReactNode;
  inspector: React.ReactNode;
  dock: React.ReactNode;
  modal?: React.ReactNode;
  mobileInspectorOpen?: boolean;
  onCloseMobileInspector?: () => void;
}

export const TacticalArenaTemplate: React.FC<TacticalArenaTemplateProps> = ({
  hud,
  stage,
  inspector,
  dock,
  modal,
  mobileInspectorOpen = false,
  onCloseMobileInspector,
}) => {
  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#161B22] text-slate-100">
      {hud}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_276px] overflow-hidden relative">
        <main className="min-w-0 min-h-0 h-full overflow-hidden">{stage}</main>
        <div className="hidden lg:block min-h-0 h-full overflow-hidden">{inspector}</div>

        {/* Mobile / Tablet Bottom Sheet Inspector */}
        {mobileInspectorOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
            <button
              type="button"
              aria-label="Close inspector"
              onClick={onCloseMobileInspector}
              className="flex-1 bg-black/55 backdrop-blur-[1px]"
            />
            <div className="max-h-[72dvh] bg-[#1C2430] border-t border-[#3A4D66] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <span className="w-10 h-1 rounded-full bg-slate-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">{inspector}</div>
            </div>
          </div>
        )}
      </div>

      {dock}
      {modal}
    </div>
  );
};
