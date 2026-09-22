export function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-[0.06]" style={{ background: '#6C4FD1' }} />
      <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-[0.05]" style={{ background: '#1FA37A' }} />
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full blur-[130px] opacity-[0.04]" style={{ background: '#E2A33D' }} />
    </div>
  );
}
