export function AppAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]">
      <div className="absolute -left-32 top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute right-[-8rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_68%)] blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[18%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.04)_0%,transparent_72%)] blur-3xl" />
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black_35%,transparent_92%)]" />
    </div>
  );
}