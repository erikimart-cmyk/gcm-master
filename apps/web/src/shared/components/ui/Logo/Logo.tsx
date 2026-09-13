export function Logo() {
  return (
    <h1 className="relative isolate inline-flex overflow-hidden text-4xl font-extrabold tracking-tight">
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-full bg-blue-500/25 blur-xl animate-[pulse_5s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <span className="relative bg-gradient-to-r from-blue-400 via-cyan-200 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(96,165,250,0.42)]">
        ZYNVO
      </span>
      <span
        aria-hidden="true"
        className="zynvo-logo-sweep pointer-events-none absolute inset-y-0 -left-8 w-5 bg-white/70 blur-sm"
      />
    </h1>
  );
}
