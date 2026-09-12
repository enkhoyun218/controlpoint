import { Info } from "lucide-react";

export default function Banner() {
  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900">
      <div className="mx-auto flex max-w-[1600px] items-start gap-2 text-[12px] leading-5">
        <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Educational concept</span> — not
          affiliated with BPM or the AICPA. The company, controls, evidence, and
          access data are synthetic. This is not an official SOC 2 assessment or
          opinion.
        </p>
      </div>
    </div>
  );
}
