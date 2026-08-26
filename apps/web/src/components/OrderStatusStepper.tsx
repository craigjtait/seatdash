const STEPS = [
  { key: "queued", label: "In Queue" },
  { key: "in_kitchen", label: "Preparing" },
  { key: "out_for_delivery", label: "On the Way" },
  { key: "delivered", label: "Delivered" },
] as const;

const STATUS_ORDER = ["pending_payment", "queued", "in_kitchen", "out_for_delivery", "delivered"];

export function OrderStatusStepper({ status }: { status: string }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, i) => {
        const stepIndex = STATUS_ORDER.indexOf(step.key);
        const isComplete = currentIndex > stepIndex;
        const isCurrent = status === step.key;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {i > 0 && (
              <div
                className={`absolute right-1/2 top-3 w-full h-0.5 -translate-y-1/2 ${
                  isComplete ? "bg-brand-blue" : "bg-brand-silver/40"
                }`}
                style={{ width: "100%", left: "-50%" }}
              />
            )}
            <div
              className={`w-6 h-6 rounded-full z-10 flex items-center justify-center text-xs font-bold ${
                isComplete
                  ? "bg-brand-blue text-white"
                  : isCurrent
                    ? "bg-brand-blue text-white ring-4 ring-brand-blue/20"
                    : "bg-brand-silver/30 text-gray-400"
              }`}
            >
              {isComplete ? "✓" : i + 1}
            </div>
            <p
              className={`text-[10px] mt-1 text-center leading-tight ${
                isCurrent ? "font-semibold text-brand-blue" : "text-gray-500"
              }`}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
