export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06] border border-white/10">
        <span className="font-mono text-[12px] font-semibold leading-none text-accent-hover">
          &gt;_
        </span>
      </span>
      <span className="font-medium tracking-tight text-zinc-100 text-[15px]">
        write<span className="text-zinc-500">code</span>
      </span>
    </span>
  );
}
