import Image from "next/image";
import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/docent-mark-v2.png?v=4" alt="Docent logo" width={20} height={20} quality={80} loading="lazy" className="h-5 w-5 invert" />
          <div className="font-mono text-[15px] tracking-[0.08em] text-white/50">Docent</div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-white/40">
          <Link href="/browse" className="transition hover:text-white/70">Browse Teachers</Link>
          <JoinAsTeacherAction className="transition hover:text-white/70">Join as Teacher</JoinAsTeacherAction>
          <Link href="/auth" className="transition hover:text-white/70">Login</Link>
          <a href="mailto:docentsupport@gmail.com" className="transition hover:text-white/70">docentsupport@gmail.com</a>
        </div>

        <p className="text-xs text-white/30">© {new Date().getFullYear()} Docent · Mathura</p>
      </div>
    </footer>
  );
}
